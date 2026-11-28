"""Return & refund request service: state machine, 7-day window validation,
payment refund integration, partial restocking, and outbox notifications."""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.exceptions import DomainException
from core.models import OutboxEvent
from modules.audit.models import ActorType
from modules.audit.service import Actor, AuditService
from modules.inventory.service import InventoryService
from modules.orders.models import Order, OrderItem, OrderStatus
from modules.payments.models import PaymentStatus
from modules.payments.service import PaymentService
from modules.returns.models import ReturnRequest, ReturnStatus
from modules.returns.repository import ReturnRepository
from modules.returns.schemas import (
    AdminReturnRequestCreate,
    PaginatedReturnRequestsResponse,
    ReturnApproveRequest,
    ReturnCloseRequest,
    ReturnMarkReceivedRequest,
    ReturnRefundRequest,
    ReturnRejectRequest,
    ReturnRequestCreate,
    ReturnRequestResponse,
    ReturnSchedulePickupRequest,
)

RETURN_WINDOW_DAYS = 7

# Allowed transitions in the return-request state machine
VALID_RETURN_TRANSITIONS: dict[str, set[str]] = {
    ReturnStatus.REQUESTED.value: {
        ReturnStatus.APPROVED.value,
        ReturnStatus.REJECTED.value,
        ReturnStatus.CLOSED.value,
    },
    ReturnStatus.APPROVED.value: {
        ReturnStatus.PICKUP_SCHEDULED.value,
        ReturnStatus.RETURNED.value,
        ReturnStatus.REJECTED.value,
        ReturnStatus.CLOSED.value,
    },
    ReturnStatus.PICKUP_SCHEDULED.value: {
        ReturnStatus.RETURNED.value,
        ReturnStatus.CLOSED.value,
    },
    ReturnStatus.RETURNED.value: {
        ReturnStatus.REFUNDED.value,
        ReturnStatus.CLOSED.value,
    },
    ReturnStatus.REFUNDED.value: {
        ReturnStatus.CLOSED.value,
    },
    ReturnStatus.REJECTED.value: {
        ReturnStatus.CLOSED.value,
    },
    ReturnStatus.CLOSED.value: set(),
}


def _row_to_response(row: Dict[str, Any]) -> ReturnRequestResponse:
    data = dict(row)
    ship_name = data.pop("ship_name", None)
    user_full_name = data.pop("user_full_name", None)
    data["customer_name"] = ship_name or user_full_name
    return ReturnRequestResponse.model_validate(data)


class ReturnService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ReturnRepository(session)

    async def _load_order(self, order_id: str) -> Optional[Order]:
        res = await self.session.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == str(order_id), Order.deleted_at.is_(None))
        )
        return res.scalar_one_or_none()

    async def _generate_return_number(self) -> str:
        stamp = datetime.now(timezone.utc).strftime("%y%m%d")
        for _ in range(5):
            candidate = f"RET-{stamp}-{secrets.token_hex(3).upper()}"
            exists = (
                await self.session.execute(
                    text("SELECT 1 FROM return_requests WHERE return_number = :rn"),
                    {"rn": candidate},
                )
            ).first()
            if not exists:
                return candidate
        return f"RET-{stamp}-{secrets.token_hex(5).upper()}"

    def _compute_refund_amount(
        self, order: Order, item: OrderItem, qty: int, remaining_refundable: int
    ) -> int:
        line_gross = int(item.unit_price) * qty
        if order.subtotal > 0 and order.discount_total > 0:
            discount_share = round(order.discount_total * line_gross / order.subtotal)
            computed = max(line_gross - discount_share, 0)
        else:
            computed = line_gross
        return min(computed, max(remaining_refundable, 0))

    async def _require_rr(self, return_id: str) -> ReturnRequest:
        rr = await self.repo.get_by_id(return_id)
        if not rr:
            raise DomainException("Return request not found", code="NOT_FOUND", status_code=404)
        return rr

    def _assert_transition(self, current: str, target: str) -> None:
        if target not in VALID_RETURN_TRANSITIONS.get(current, set()):
            raise DomainException(
                f"Cannot transition return request from {current} to {target}",
                code="INVALID_STATE_TRANSITION",
                status_code=400,
            )

    def _queue_outbox(self, tenant_id: str, event_type: str, payload: dict[str, Any]) -> None:
        self.session.add(
            OutboxEvent(
                tenant_id=tenant_id,
                type=event_type,
                payload=payload,
            )
        )

    async def _record_audit(
        self,
        *,
        actor: Optional[Actor],
        action: str,
        rr: ReturnRequest,
        before: Optional[dict] = None,
        after: Optional[dict] = None,
    ) -> None:
        try:
            await AuditService(self.session).record(
                actor=actor
                or Actor(
                    type=ActorType.STAFF.value,
                    name="return-admin",
                    business_id=rr.business_id,
                ),
                action=action,
                entity_type="return_request",
                entity_id=str(rr.id),
                entity_label=rr.return_number,
                before=before,
                after=after,
            )
        except Exception:
            pass

    # ------------------------------------------------------------------ #
    # Create return request (customer or staff)                            #
    # ------------------------------------------------------------------ #

    async def create_return_request(
        self,
        order_id: str,
        payload: ReturnRequestCreate | AdminReturnRequestCreate,
        *,
        actor_user_id: Optional[str],
        is_staff: bool = False,
        actor: Optional[Actor] = None,
    ) -> ReturnRequestResponse:
        order = await self._load_order(order_id)
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)

        if not is_staff and str(order.user_id) != str(actor_user_id):
            raise DomainException("Not your order", code="FORBIDDEN", status_code=403)

        if order.status not in (OrderStatus.DELIVERED, OrderStatus.RETURNED):
            raise DomainException(
                "Returns can only be requested for delivered orders.",
                code="ORDER_NOT_DELIVERED",
                status_code=400,
            )

        bypass_window = bool(getattr(payload, "bypass_window", False)) and is_staff
        if not bypass_window:
            delivered_at = order.delivered_at
            if delivered_at is None:
                raise DomainException(
                    "Delivery timestamp is missing for this order.",
                    code="RETURN_WINDOW_UNAVAILABLE",
                    status_code=400,
                )
            if delivered_at.tzinfo is None:
                delivered_at = delivered_at.replace(tzinfo=timezone.utc)
            deadline = delivered_at + timedelta(days=RETURN_WINDOW_DAYS)
            if datetime.now(timezone.utc) > deadline:
                raise DomainException(
                    f"The {RETURN_WINDOW_DAYS}-day return window for this order expired on {deadline:%d %b %Y}.",
                    code="RETURN_WINDOW_EXPIRED",
                    status_code=400,
                )

        order_item = next(
            (i for i in order.items if str(i.id) == str(payload.order_item_id)),
            None,
        )
        if not order_item:
            raise DomainException(
                "Order item not found on this order.",
                code="NOT_FOUND",
                status_code=404,
            )

        used_qty = await self.repo.sum_active_qty_for_item(order_item.id)
        remaining_qty = max(int(order_item.quantity) - used_qty, 0)
        if payload.qty > remaining_qty:
            raise DomainException(
                f"Cannot return {payload.qty} unit(s): only {remaining_qty} unit(s) remaining returnable.",
                code="EXCEEDS_PURCHASED_QTY",
                status_code=409,
            )

        already_refund_planned = await self.repo.sum_active_refund_for_order(order.id)
        remaining_refundable = max(int(order.total) - already_refund_planned, 0)

        explicit_refund = getattr(payload, "refund_amount", None) if is_staff else None
        if explicit_refund is not None:
            if explicit_refund > remaining_refundable:
                raise DomainException(
                    "Refund amount exceeds remaining refundable order total.",
                    code="AMOUNT_EXCEEDS_ORDER",
                    status_code=400,
                )
            refund_amount = int(explicit_refund)
        else:
            refund_amount = self._compute_refund_amount(
                order, order_item, payload.qty, remaining_refundable
            )

        seller_id = order_item.seller_id
        if not seller_id:
            prod_sid = (
                await self.session.execute(
                    text("SELECT seller_id FROM products WHERE id = :pid"),
                    {"pid": str(order_item.product_id)},
                )
            ).scalar()
            if prod_sid:
                seller_id = str(prod_sid)

        return_number = await self._generate_return_number()
        rr = ReturnRequest(
            return_number=return_number,
            order_id=str(order.id),
            order_item_id=str(order_item.id),
            user_id=str(order.user_id),
            business_id=str(order.business_id),
            seller_id=str(seller_id) if seller_id else None,
            qty=int(payload.qty),
            reason=payload.reason.value,
            customer_note=(payload.customer_note or "").strip() or None,
            status=ReturnStatus.REQUESTED.value,
            refund_amount=refund_amount,
        )
        await self.repo.create(rr)

        self._queue_outbox(
            order.business_id,
            "return.requested",
            {
                "return_id": str(rr.id),
                "return_number": rr.return_number,
                "order_id": str(order.id),
                "order_number": order.order_number,
                "order_item_id": str(order_item.id),
                "user_id": str(order.user_id),
                "seller_id": rr.seller_id,
                "product_name": order_item.product_name,
                "variant_name": order_item.variant_name,
                "qty": rr.qty,
                "unit_price": order_item.unit_price,
                "reason": rr.reason,
                "customer_note": rr.customer_note,
                "refund_amount": rr.refund_amount,
                "payment_method": order.payment_method,
            },
        )

        await self._record_audit(
            actor=actor
            or Actor(
                type=ActorType.USER.value,
                id=str(actor_user_id) if actor_user_id else None,
                business_id=order.business_id,
            ),
            action="return.requested",
            rr=rr,
            after={
                "status": rr.status,
                "qty": rr.qty,
                "reason": rr.reason,
                "refund_amount": rr.refund_amount,
            },
        )

        await self.session.commit()
        enriched = await self.repo.get_enriched_by_id(rr.id)
        return _row_to_response(enriched)

    # ------------------------------------------------------------------ #
    # Reads (customer / seller / staff)                                    #
    # ------------------------------------------------------------------ #

    async def list_customer_returns(
        self, user_id: str, order_id: Optional[str] = None, page: int = 1, page_size: int = 20
    ) -> PaginatedReturnRequestsResponse:
        rows, total = await self.repo.list_enriched(
            user_id=user_id, order_id=order_id, page=page, page_size=page_size
        )
        return PaginatedReturnRequestsResponse(
            items=[_row_to_response(r) for r in rows],
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
            has_prev=page > 1,
        )

    async def list_seller_returns(
        self,
        seller_id: str,
        status: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedReturnRequestsResponse:
        rows, total = await self.repo.list_enriched(
            seller_id=seller_id,
            status=status,
            q=q,
            include_customer_pii=False,
            page=page,
            page_size=page_size,
        )
        return PaginatedReturnRequestsResponse(
            items=[_row_to_response(r) for r in rows],
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
            has_prev=page > 1,
        )

    async def list_admin_returns(
        self,
        status: Optional[str] = None,
        q: Optional[str] = None,
        order_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedReturnRequestsResponse:
        rows, total = await self.repo.list_enriched(
            status=status,
            q=q,
            order_id=order_id,
            include_customer_pii=True,
            page=page,
            page_size=page_size,
        )
        return PaginatedReturnRequestsResponse(
            items=[_row_to_response(r) for r in rows],
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
            has_prev=page > 1,
        )

    async def get_return(
        self, return_id: str, *, user_id: Optional[str] = None, is_staff: bool = False
    ) -> ReturnRequestResponse:
        row = await self.repo.get_enriched_by_id(return_id)
        if not row:
            raise DomainException("Return request not found", code="NOT_FOUND", status_code=404)
        if not is_staff and str(row["user_id"]) != str(user_id):
            raise DomainException("Not your return request", code="FORBIDDEN", status_code=403)
        return _row_to_response(row)

    # ------------------------------------------------------------------ #
    # Staff decision endpoints                                             #
    # ------------------------------------------------------------------ #

    async def approve(
        self,
        return_id: str,
        payload: ReturnApproveRequest,
        staff_id: str,
        actor: Optional[Actor] = None,
    ) -> ReturnRequestResponse:
        rr = await self._require_rr(return_id)
        self._assert_transition(rr.status, ReturnStatus.APPROVED.value)
        order = await self._load_order(rr.order_id)
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)

        before = {"status": rr.status, "refund_amount": rr.refund_amount}
        if payload.refund_amount is not None:
            other_planned = await self.repo.sum_active_refund_for_order(
                order.id, exclude_return_id=rr.id
            )
            max_allowed = max(int(order.total) - other_planned, 0)
            if payload.refund_amount > max_allowed:
                raise DomainException(
                    "Refund amount exceeds remaining refundable order total.",
                    code="AMOUNT_EXCEEDS_ORDER",
                    status_code=400,
                )
            rr.refund_amount = int(payload.refund_amount)

        rr.status = ReturnStatus.APPROVED.value
        rr.approved_at = datetime.now(timezone.utc)
        rr.reviewed_by = str(staff_id)
        if payload.resolution_note is not None:
            rr.resolution_note = payload.resolution_note.strip() or rr.resolution_note

        order_item = next((i for i in order.items if str(i.id) == str(rr.order_item_id)), None)
        self._queue_outbox(
            rr.business_id,
            "return.approved",
            {
                "return_id": str(rr.id),
                "return_number": rr.return_number,
                "order_id": str(order.id),
                "order_number": order.order_number,
                "user_id": str(rr.user_id),
                "seller_id": rr.seller_id,
                "product_name": order_item.product_name if order_item else "Item",
                "qty": rr.qty,
                "unit_price": order_item.unit_price if order_item else 0,
                "refund_amount": rr.refund_amount,
                "resolution_note": rr.resolution_note,
            },
        )
        await self._record_audit(
            actor=actor,
            action="return.approved",
            rr=rr,
            before=before,
            after={"status": rr.status, "refund_amount": rr.refund_amount},
        )
        await self.session.commit()
        return _row_to_response(await self.repo.get_enriched_by_id(rr.id))

    async def reject(
        self,
        return_id: str,
        payload: ReturnRejectRequest,
        staff_id: str,
        actor: Optional[Actor] = None,
    ) -> ReturnRequestResponse:
        rr = await self._require_rr(return_id)
        self._assert_transition(rr.status, ReturnStatus.REJECTED.value)
        order = await self._load_order(rr.order_id)

        before = {"status": rr.status}
        rr.status = ReturnStatus.REJECTED.value
        rr.rejected_at = datetime.now(timezone.utc)
        rr.reviewed_by = str(staff_id)
        rr.resolution_note = payload.resolution_note.strip()

        order_item = (
            next((i for i in order.items if str(i.id) == str(rr.order_item_id)), None)
            if order
            else None
        )
        self._queue_outbox(
            rr.business_id,
            "return.rejected",
            {
                "return_id": str(rr.id),
                "return_number": rr.return_number,
                "order_id": str(rr.order_id),
                "order_number": order.order_number if order else "",
                "user_id": str(rr.user_id),
                "seller_id": rr.seller_id,
                "product_name": order_item.product_name if order_item else "Item",
                "qty": rr.qty,
                "resolution_note": rr.resolution_note,
            },
        )
        await self._record_audit(
            actor=actor,
            action="return.rejected",
            rr=rr,
            before=before,
            after={"status": rr.status, "resolution_note": rr.resolution_note},
        )
        await self.session.commit()
        return _row_to_response(await self.repo.get_enriched_by_id(rr.id))

    async def schedule_pickup(
        self,
        return_id: str,
        payload: ReturnSchedulePickupRequest,
        staff_id: str,
        actor: Optional[Actor] = None,
    ) -> ReturnRequestResponse:
        rr = await self._require_rr(return_id)
        self._assert_transition(rr.status, ReturnStatus.PICKUP_SCHEDULED.value)
        order = await self._load_order(rr.order_id)

        before = {"status": rr.status, "pickup_tracking": rr.pickup_tracking}
        rr.status = ReturnStatus.PICKUP_SCHEDULED.value
        rr.pickup_scheduled_at = datetime.now(timezone.utc)
        rr.reviewed_by = str(staff_id)
        if payload.pickup_tracking is not None:
            rr.pickup_tracking = payload.pickup_tracking.strip() or None
        if payload.resolution_note is not None:
            rr.resolution_note = payload.resolution_note.strip() or rr.resolution_note

        order_item = (
            next((i for i in order.items if str(i.id) == str(rr.order_item_id)), None)
            if order
            else None
        )
        self._queue_outbox(
            rr.business_id,
            "return.pickup_scheduled",
            {
                "return_id": str(rr.id),
                "return_number": rr.return_number,
                "order_id": str(rr.order_id),
                "order_number": order.order_number if order else "",
                "user_id": str(rr.user_id),
                "seller_id": rr.seller_id,
                "product_name": order_item.product_name if order_item else "Item",
                "qty": rr.qty,
                "pickup_tracking": rr.pickup_tracking,
            },
        )
        await self._record_audit(
            actor=actor,
            action="return.pickup_scheduled",
            rr=rr,
            before=before,
            after={"status": rr.status, "pickup_tracking": rr.pickup_tracking},
        )
        await self.session.commit()
        return _row_to_response(await self.repo.get_enriched_by_id(rr.id))

    async def _execute_refund(
        self,
        rr: ReturnRequest,
        order: Order,
        staff_id: str,
        actor: Optional[Actor],
    ) -> None:
        order_item = next((i for i in order.items if str(i.id) == str(rr.order_item_id)), None)
        if not order_item:
            raise DomainException("Order item not found", code="NOT_FOUND", status_code=404)

        total_purchased_qty = sum(int(i.quantity) for i in order.items)
        returned_qty = await self.repo.sum_returned_qty_for_order(order.id)
        is_full_order_return = returned_qty >= total_purchased_qty

        pay_row = (
            await self.session.execute(
                text(
                    "SELECT id, amount FROM payments "
                    "WHERE order_id = :oid AND status = :st "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"oid": str(order.id), "st": PaymentStatus.SUCCESS.value},
            )
        ).mappings().first()

        reason_str = f"Return {rr.return_number or rr.id[:8]}: {rr.reason}"
        if pay_row and rr.refund_amount > 0:
            pay_svc = PaymentService(self.session)
            await pay_svc.refund_payment(
                payment_id=str(pay_row["id"]),
                refund_amount=rr.refund_amount,
                reason=reason_str,
                restock_items=[(str(order_item.product_id), int(rr.qty))],
                mark_order_refunded=is_full_order_return,
                emit_order_refunded=False,
                commit=False,
            )
            rr.payment_id = str(pay_row["id"])
        else:
            # COD order (no gateway payment) or ₹0 refund: restock returned units directly.
            if order.stock_committed:
                await InventoryService(self.session).restock_item_for_order(
                    order, str(order_item.product_id), int(rr.qty), note=reason_str
                )
            if is_full_order_return:
                order.status = OrderStatus.REFUNDED

        if is_full_order_return:
            order.stock_committed = False

        rr.status = ReturnStatus.REFUNDED.value
        rr.refunded_at = datetime.now(timezone.utc)
        rr.reviewed_by = str(staff_id)

        self._queue_outbox(
            rr.business_id,
            "return.refunded",
            {
                "return_id": str(rr.id),
                "return_number": rr.return_number,
                "order_id": str(order.id),
                "order_number": order.order_number,
                "user_id": str(rr.user_id),
                "seller_id": rr.seller_id,
                "product_name": order_item.product_name,
                "qty": rr.qty,
                "unit_price": order_item.unit_price,
                "refund_amount": rr.refund_amount,
                "payment_method": order.payment_method,
                "reason": rr.reason,
                "resolution_note": rr.resolution_note,
            },
        )
        await self._record_audit(
            actor=actor,
            action="return.refunded",
            rr=rr,
            after={
                "status": rr.status,
                "refund_amount": rr.refund_amount,
                "payment_id": rr.payment_id,
            },
        )

    async def mark_received(
        self,
        return_id: str,
        payload: ReturnMarkReceivedRequest,
        staff_id: str,
        actor: Optional[Actor] = None,
    ) -> ReturnRequestResponse:
        rr = await self._require_rr(return_id)
        self._assert_transition(rr.status, ReturnStatus.RETURNED.value)
        order = await self._load_order(rr.order_id)
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)

        before = {"status": rr.status, "refund_amount": rr.refund_amount}
        if payload.refund_amount is not None:
            other_planned = await self.repo.sum_active_refund_for_order(
                order.id, exclude_return_id=rr.id
            )
            max_allowed = max(int(order.total) - other_planned, 0)
            if payload.refund_amount > max_allowed:
                raise DomainException(
                    "Refund amount exceeds remaining refundable order total.",
                    code="AMOUNT_EXCEEDS_ORDER",
                    status_code=400,
                )
            rr.refund_amount = int(payload.refund_amount)

        rr.status = ReturnStatus.RETURNED.value
        rr.returned_at = datetime.now(timezone.utc)
        rr.reviewed_by = str(staff_id)
        if payload.resolution_note is not None:
            rr.resolution_note = payload.resolution_note.strip() or rr.resolution_note

        if order.status == OrderStatus.DELIVERED:
            order.status = OrderStatus.RETURNED

        await self.session.flush()
        await self._record_audit(
            actor=actor,
            action="return.received",
            rr=rr,
            before=before,
            after={"status": rr.status},
        )

        if payload.issue_refund:
            await self._execute_refund(rr, order, staff_id, actor)

        await self.session.commit()
        return _row_to_response(await self.repo.get_enriched_by_id(rr.id))

    async def issue_refund(
        self,
        return_id: str,
        payload: ReturnRefundRequest,
        staff_id: str,
        actor: Optional[Actor] = None,
    ) -> ReturnRequestResponse:
        rr = await self._require_rr(return_id)
        self._assert_transition(rr.status, ReturnStatus.REFUNDED.value)
        order = await self._load_order(rr.order_id)
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)

        if payload.refund_amount is not None:
            other_planned = await self.repo.sum_active_refund_for_order(
                order.id, exclude_return_id=rr.id
            )
            max_allowed = max(int(order.total) - other_planned, 0)
            if payload.refund_amount > max_allowed:
                raise DomainException(
                    "Refund amount exceeds remaining refundable order total.",
                    code="AMOUNT_EXCEEDS_ORDER",
                    status_code=400,
                )
            rr.refund_amount = int(payload.refund_amount)
        if payload.resolution_note is not None:
            rr.resolution_note = payload.resolution_note.strip() or rr.resolution_note

        await self._execute_refund(rr, order, staff_id, actor)
        await self.session.commit()
        return _row_to_response(await self.repo.get_enriched_by_id(rr.id))

    async def close(
        self,
        return_id: str,
        payload: ReturnCloseRequest,
        *,
        actor_user_id: str,
        is_staff: bool,
        actor: Optional[Actor] = None,
    ) -> ReturnRequestResponse:
        rr = await self._require_rr(return_id)
        if not is_staff:
            if str(rr.user_id) != str(actor_user_id):
                raise DomainException("Not your return request", code="FORBIDDEN", status_code=403)
            if rr.status != ReturnStatus.REQUESTED.value:
                raise DomainException(
                    "Only pending return requests can be withdrawn.",
                    code="INVALID_STATE_TRANSITION",
                    status_code=400,
                )
        self._assert_transition(rr.status, ReturnStatus.CLOSED.value)

        before = {"status": rr.status}
        rr.status = ReturnStatus.CLOSED.value
        rr.closed_at = datetime.now(timezone.utc)
        if is_staff:
            rr.reviewed_by = str(actor_user_id)
        if payload.resolution_note:
            rr.resolution_note = payload.resolution_note.strip()

        await self._record_audit(
            actor=actor,
            action="return.closed",
            rr=rr,
            before=before,
            after={"status": rr.status},
        )
        await self.session.commit()
        return _row_to_response(await self.repo.get_enriched_by_id(rr.id))
