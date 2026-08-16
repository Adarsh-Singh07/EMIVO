"""Inventory service: transactional stock operations with a full audit trail.

Order lifecycle integration (called by checkout / payments / order status):
  - checkout (order created)      -> reserve_order_stock
  - payment captured / COD placed* -> commit_order_stock   (*COD commits at DELIVERED)
  - cancelled / failed / expired  -> release_order_stock
  - admin cancel after commit     -> restock_order (RETURN)
Every mutation writes an inventory_movements row in the same transaction.
"""
import logging
from typing import Optional, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.inventory.models import InventoryReason
from modules.inventory.repository import InventoryRepository
from modules.inventory.schemas import (
    InventoryAdjustRequest,
    InventoryListResponse,
    InventoryResponse,
    InventoryMovementsResponse,
    InventoryMovementResponse,
)
from modules.orders.models import Order

logger = logging.getLogger(__name__)


class InventoryService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = InventoryRepository(session)

    # ------------------------------------------------------------------ #
    # Order lifecycle integration (called within the caller's transaction)
    # ------------------------------------------------------------------ #

    async def reserve_for_order(self, order: Order, items: Sequence) -> None:
        """Reserve stock for every order item. Raises OUT_OF_STOCK on failure —
        the caller's transaction (and reservations made so far) rolls back."""
        for item in items:
            row = await self.repository.reserve(item.product_id, item.quantity)
            if row is None:
                raise DomainException(
                    f"Only limited stock left for '{item.product_name}' — please adjust quantity",
                    code="OUT_OF_STOCK",
                    status_code=409,
                )
            on_hand, reserved = row
            await self.repository.log_movement(
                product_id=item.product_id,
                business_id=order.business_id,
                delta_on_hand=0,
                delta_reserved=item.quantity,
                on_hand_after=on_hand,
                reserved_after=reserved,
                reason=InventoryReason.RESERVE,
                order_id=order.id,
            )

    async def commit_for_order(self, order: Order) -> None:
        """Convert reservations to sales (payment captured / COD delivered)."""
        if order.stock_committed:
            return
        for item in order.items:
            row = await self.repository.commit_sale(item.product_id, item.quantity)
            if row is None:
                # Reservation already gone (e.g. expired release raced us) —
                # log loudly; stock integrity checks run in tests.
                logger.error(
                    "commit_for_order: missing reservation order=%s product=%s qty=%s",
                    order.id, item.product_id, item.quantity,
                )
                continue
            on_hand, reserved = row
            await self.repository.log_movement(
                product_id=item.product_id,
                business_id=order.business_id,
                delta_on_hand=-item.quantity,
                delta_reserved=-item.quantity,
                on_hand_after=on_hand,
                reserved_after=reserved,
                reason=InventoryReason.SALE,
                order_id=order.id,
            )
        order.stock_committed = True

    async def release_for_order(self, order: Order) -> None:
        """Release uncommitted reservations (cancel / payment failure)."""
        if order.stock_committed:
            return
        for item in order.items:
            row = await self.repository.release(item.product_id, item.quantity)
            if row is None:
                continue
            on_hand, reserved = row
            await self.repository.log_movement(
                product_id=item.product_id,
                business_id=order.business_id,
                delta_on_hand=0,
                delta_reserved=-item.quantity,
                on_hand_after=on_hand,
                reserved_after=reserved,
                reason=InventoryReason.RELEASE,
                order_id=order.id,
            )

    async def restock_for_order(self, order: Order) -> None:
        """Return committed units to stock (refund / post-ship cancel)."""
        for item in order.items:
            row = await self.repository.restock(item.product_id, item.quantity)
            on_hand, reserved = row
            await self.repository.log_movement(
                product_id=item.product_id,
                business_id=order.business_id,
                delta_on_hand=item.quantity,
                delta_reserved=0,
                on_hand_after=on_hand,
                reserved_after=reserved,
                reason=InventoryReason.RETURN,
                order_id=order.id,
            )
        order.stock_committed = False

    # ------------------------------------------------------------------ #
    # Admin operations
    # ------------------------------------------------------------------ #

    async def adjust(
        self,
        product_id: str,
        request: InventoryAdjustRequest,
        business_id: str,
        actor_id: Optional[str] = None,
    ) -> InventoryResponse:
        inv = await self.repository.get_by_product(product_id)
        if inv is None:
            raise DomainException("No inventory record for product", code="NOT_FOUND", status_code=404)

        before = (inv["on_hand"], inv["reserved"])
        try:
            if request.mode == "set":
                reason = InventoryReason.COUNT
                after = await self.repository.set_on_hand(product_id, request.value)
            elif request.mode == "restock":
                reason = InventoryReason.RESTOCK
                after = await self.repository.restock(product_id, request.value)
            elif request.mode == "delta":
                reason = InventoryReason.ADJUST
                if request.value == 0:
                    after = (inv["on_hand"], inv["reserved"])
                elif request.value > 0:
                    after = await self.repository.restock(product_id, request.value)
                else:
                    after = await self.repository.write_off(product_id, -request.value, from_reserved=False)
            elif request.mode == "damage":
                reason = InventoryReason.DAMAGE
                after = await self.repository.write_off(product_id, request.value, from_reserved=False)
            elif request.mode == "return":
                reason = InventoryReason.RETURN
                after = await self.repository.restock(product_id, request.value)
            else:  # pragma: no cover - schema-constrained
                raise DomainException("Invalid mode", code="BAD_REQUEST", status_code=400)
        except ValueError as exc:
            raise DomainException(str(exc), code="INVENTORY_CONFLICT", status_code=409)

        if request.low_stock_threshold is not None:
            await self.session.execute(
                text(
                    "UPDATE inventory SET low_stock_threshold = :t, updated_at = now() WHERE product_id = :pid"
                ),
                {"t": request.low_stock_threshold, "pid": product_id},
            )

        if before != after:
            await self.repository.log_movement(
                product_id=product_id,
                business_id=business_id,
                delta_on_hand=after[0] - before[0],
                delta_reserved=after[1] - before[1],
                on_hand_after=after[0],
                reserved_after=after[1],
                reason=reason,
                note=request.note,
                actor_id=actor_id,
            )
        await self.session.commit()

        refreshed = await self.repository.get_by_product(product_id)
        return self._to_response(refreshed)

    async def list_inventory(
        self,
        business_id: str,
        query: Optional[str] = None,
        low_stock_only: bool = False,
        out_of_stock_only: bool = False,
        page: int = 1,
        page_size: int = 50,
    ) -> InventoryListResponse:
        items, total = await self.repository.list_inventory(
            business_id=business_id,
            query=query,
            low_stock_only=low_stock_only,
            out_of_stock_only=out_of_stock_only,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        resp_items = [self._to_response_row(row) for row in items]
        return InventoryListResponse(
            items=resp_items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
        )

    async def movements(self, product_id: Optional[str], limit: int = 100) -> InventoryMovementsResponse:
        from sqlalchemy import select
        from modules.inventory.models import InventoryMovement

        stmt = select(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(limit)
        if product_id:
            stmt = stmt.where(InventoryMovement.product_id == product_id)
        res = await self.session.execute(stmt)
        rows = res.scalars().all()
        return InventoryMovementsResponse(
            items=[InventoryMovementResponse.model_validate(m) for m in rows],
            total=len(rows),
        )

    def _to_response(self, inv) -> InventoryResponse:
        return self._to_response_row(inv)

    def _to_response_row(self, row) -> InventoryResponse:
        d = dict(row) if not hasattr(row, "on_hand") else {
            "product_id": row.product_id,
            "business_id": row.business_id,
            "on_hand": row.on_hand,
            "reserved": row.reserved,
            "low_stock_threshold": row.low_stock_threshold,
            "updated_at": row.updated_at,
        }
        available = d["on_hand"] - d["reserved"]
        return InventoryResponse(
            product_id=d["product_id"],
            product_name=row.get("product_name") if hasattr(row, "get") else d.get("product_name"),
            product_sku=row.get("product_sku") if hasattr(row, "get") else d.get("product_sku"),
            business_id=d["business_id"],
            on_hand=d["on_hand"],
            reserved=d["reserved"],
            available=available,
            low_stock_threshold=d["low_stock_threshold"],
            is_low_stock=available <= d["low_stock_threshold"],
            is_out_of_stock=available <= 0,
            updated_at=d.get("updated_at"),
        )
