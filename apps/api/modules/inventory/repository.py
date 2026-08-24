"""Inventory data access. All mutations are single-statement atomic SQL so
concurrent checkouts can never oversell (the WHERE clause includes the
availability guard and the row update is serialized by the row lock Postgres
takes for the UPDATE)."""
from typing import Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from modules.inventory.models import Inventory, InventoryMovement, InventoryReason


class InventoryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # -- Atomic stock operations (single statement, availability-guarded) ----

    async def reserve(self, product_id: str, qty: int) -> Optional[Tuple[int, int]]:
        """Atomically reserve qty units. Returns (on_hand, reserved) after, or
        None when insufficient stock. Concurrent callers are serialized on the
        row lock; exactly one wins the last unit."""
        res = await self.session.execute(
            text("""
                UPDATE inventory
                SET reserved = reserved + :qty, updated_at = now()
                WHERE product_id = :pid
                  AND on_hand - reserved >= :qty
                RETURNING on_hand, reserved
            """),
            {"pid": product_id, "qty": qty},
        )
        return res.one_or_none()

    async def release(self, product_id: str, qty: int) -> Optional[Tuple[int, int]]:
        """Release a prior reservation (cancel/failure/expiry)."""
        res = await self.session.execute(
            text("""
                UPDATE inventory
                SET reserved = reserved - :qty, updated_at = now()
                WHERE product_id = :pid AND reserved >= :qty
                RETURNING on_hand, reserved
            """),
            {"pid": product_id, "qty": qty},
        )
        return res.one_or_none()

    async def commit_sale(self, product_id: str, qty: int) -> Optional[Tuple[int, int]]:
        """Convert reserved units into sold units (payment captured / COD delivered):
        on_hand and reserved both drop by qty."""
        res = await self.session.execute(
            text("""
                UPDATE inventory
                SET on_hand = on_hand - :qty,
                    reserved = reserved - :qty,
                    updated_at = now()
                WHERE product_id = :pid
                  AND reserved >= :qty
                RETURNING on_hand, reserved
            """),
            {"pid": product_id, "qty": qty},
        )
        return res.one_or_none()

    async def restock(self, product_id: str, qty: int) -> Tuple[int, int]:
        res = await self.session.execute(
            text("""
                UPDATE inventory
                SET on_hand = on_hand + :qty, updated_at = now()
                WHERE product_id = :pid
                RETURNING on_hand, reserved
            """),
            {"pid": product_id, "qty": qty},
        )
        return res.one()

    async def set_on_hand(self, product_id: str, absolute: int) -> Tuple[int, int]:
        """Physical stock-take: set on_hand keeping reserved intact. Fails if
        absolute < reserved (would break reserved <= on_hand)."""
        res = await self.session.execute(
            text("""
                UPDATE inventory
                SET on_hand = :abs, updated_at = now()
                WHERE product_id = :pid AND :abs >= reserved
                RETURNING on_hand, reserved
            """),
            {"pid": product_id, "abs": absolute},
        )
        row = res.one_or_none()
        if row is None:
            raise ValueError("Absolute stock below current reservations")
        return row

    async def write_off(self, product_id: str, qty: int, from_reserved: bool) -> Tuple[int, int]:
        """Damage/spoilage removal. from_reserved=True removes committed units
        (reserved); otherwise removes available on_hand."""
        if from_reserved:
            res = await self.session.execute(
                text("""
                    UPDATE inventory
                    SET on_hand = on_hand - :qty, reserved = reserved - :qty, updated_at = now()
                    WHERE product_id = :pid AND reserved >= :qty
                    RETURNING on_hand, reserved
                """),
                {"pid": product_id, "qty": qty},
            )
        else:
            res = await self.session.execute(
                text("""
                    UPDATE inventory
                    SET on_hand = on_hand - :qty, updated_at = now()
                    WHERE product_id = :pid AND on_hand - reserved >= :qty
                    RETURNING on_hand, reserved
                """),
                {"pid": product_id, "qty": qty},
            )
        row = res.one_or_none()
        if row is None:
            raise ValueError("Insufficient stock for write-off")
        return row

    # -- Reads / maintenance --------------------------------------------------

    async def get_by_product(self, product_id: str) -> Optional[Inventory]:
        res = await self.session.execute(
            text("SELECT * FROM inventory WHERE product_id = :pid"), {"pid": product_id}
        )
        row = res.mappings().first()
        return row

    async def ensure_row(self, product_id: str, business_id: str, on_hand: int = 0, variant_id: str = None) -> None:
        await self.session.execute(
            text("""
                INSERT INTO inventory (id, product_id, variant_id, business_id, on_hand, reserved, low_stock_threshold)
                VALUES (gen_random_uuid()::text, :pid, :vid, :bid, :oh, 0, 5)
                ON CONFLICT (variant_id) DO NOTHING
            """),
            {"pid": product_id, "vid": variant_id, "bid": business_id, "oh": on_hand},
        )

    async def log_movement(
        self,
        product_id: str,
        business_id: str,
        delta_on_hand: int,
        delta_reserved: int,
        on_hand_after: int,
        reserved_after: int,
        reason: InventoryReason,
        order_id: Optional[str] = None,
        note: Optional[str] = None,
        actor_id: Optional[str] = None,
    ) -> None:
        self.session.add(
            InventoryMovement(
                product_id=product_id,
                business_id=business_id,
                order_id=order_id,
                delta_on_hand=delta_on_hand,
                delta_reserved=delta_reserved,
                on_hand_after=on_hand_after,
                reserved_after=reserved_after,
                reason=reason,
                note=note,
                actor_id=actor_id,
            )
        )

    async def list_inventory(
        self,
        business_id: str,
        query: Optional[str] = None,
        low_stock_only: bool = False,
        out_of_stock_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ):
        """Join inventory with products for the admin view."""
        filters = ["i.business_id = :bid"]
        params: dict = {"bid": business_id, "lim": limit, "off": offset}
        if low_stock_only:
            filters.append("i.on_hand - i.reserved <= i.low_stock_threshold")
        if out_of_stock_only:
            filters.append("i.on_hand - i.reserved <= 0")
        if query:
            filters.append("(p.name ILIKE :q OR p.sku ILIKE :q)")
            params["q"] = f"%{query}%"
        where = " AND ".join(filters)

        rows = await self.session.execute(
            text(f"""
                SELECT i.*, p.name AS product_name, p.sku AS product_sku,
                       (i.on_hand - i.reserved) AS available
                FROM inventory i JOIN products p ON p.id = i.product_id
                WHERE {where}
                ORDER BY (i.on_hand - i.reserved) ASC, p.name ASC
                LIMIT :lim OFFSET :off
            """),
            params,
        )
        count = await self.session.execute(
            text(f"""
                SELECT count(*) FROM inventory i JOIN products p ON p.id = i.product_id
                WHERE {where}
            """),
            params,
        )
        return rows.mappings().all(), count.scalar()
