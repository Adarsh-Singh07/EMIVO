"""Seller copies of order lifecycle emails.

Customers get the full order journey; the seller whose items ride on a
shared order historically heard nothing. This module mirrors the WhatsApp
hook: it rides the same outbox events (order.created / shipped / delivered
/ cancelled / refunded), looks up the sellers attributed to the order's
items, and queues ONE branded email per seller with only their lines.

Payment-confirmed guard (owner rule): sellers only ever receive orders
whose payment is confirmed. order.created is emitted for COD at placement
and prepaid at capture — both confirmed — but the helper re-checks the
order status anyway so an unpaid order can never reach a seller's inbox.
`order.packed` is deliberately NOT mapped: packing is the seller's own
action.
"""
import logging
from typing import Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

# customer outbox event -> seller outbox event
SELLER_EVENT_MAP = {
    "order.created": "seller.order.new",
    "order.shipped": "seller.order.shipped",
    "order.delivered": "seller.order.delivered",
    "order.cancelled": "seller.order.cancelled",
    "order.refunded": "seller.order.refunded",
}

_CONFIRMED_STATUSES = ("CONFIRMED", "PROCESSING", "PACKED", "SHIPPED",
                       "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED")


async def maybe_queue_seller_order_emails(session, event_type: str, payload: dict) -> int:
    """Queue seller copies for one order lifecycle event.

    Returns the number of seller emails queued (0 when the event carries no
    seller-attributed items). Never raises — caller treats this as best-effort.
    """
    seller_event = SELLER_EVENT_MAP.get(event_type)
    if not seller_event:
        return 0
    order_id = payload.get("order_id")
    if not order_id:
        return 0

    order_row = (await session.execute(text("""
        SELECT order_number, status::text AS status, business_id,
               tracking_number, payment_method
        FROM orders WHERE id = :oid
    """), {"oid": str(order_id)})).mappings().first()
    if not order_row:
        return 0

    # Payment-confirmed guard: PENDING means the order is not yet paid.
    if order_row["status"] not in _CONFIRMED_STATUSES:
        logger.info("seller email skipped for %s: order %s status %s",
                    event_type, order_row["order_number"], order_row["status"])
        return 0

    seller_rows = (await session.execute(text("""
        SELECT oi.seller_id,
               COALESCE(s.email, '') AS email,
               COALESCE(s.business_name, 'Merchant') AS business_name,
               oi.product_name, oi.quantity, oi.unit_price
        FROM order_items oi
        JOIN sellers s ON s.id = oi.seller_id
        WHERE oi.order_id = :oid AND oi.seller_id IS NOT NULL
    """), {"oid": str(order_id)})).mappings().all()
    if not seller_rows:
        return 0

    from core.models import OutboxEvent

    per_seller: dict[str, dict] = {}
    for r in seller_rows:
        sid = str(r["seller_id"])
        entry = per_seller.setdefault(sid, {
            "email": r["email"],
            "business_name": r["business_name"],
            "items": [],
            "lines_total": 0,
        })
        qty = int(r["quantity"] or 1)
        unit = int(r["unit_price"] or 0)
        entry["items"].append({"name": r["product_name"], "qty": qty, "unit_price": unit})
        entry["lines_total"] += unit * qty

    queued = 0
    for sid, entry in per_seller.items():
        if not entry["email"]:
            logger.warning("seller %s has no email on file — %s skipped", sid, seller_event)
            continue
        session.add(OutboxEvent(
            tenant_id=order_row["business_id"],
            type=seller_event,
            payload={
                "email": entry["email"],
                "business_name": entry["business_name"],
                "seller_id": sid,
                "order_id": str(order_id),
                "order_number": payload.get("order_number") or order_row["order_number"],
                "items": entry["items"],
                "items_total": entry["lines_total"],
                "tracking_number": payload.get("tracking_number") or order_row["tracking_number"],
                "refund_amount": payload.get("refund_amount"),
                "reason": payload.get("reason"),
                "is_cod": (order_row["payment_method"] == "COD"),
            },
        ))
        queued += 1
    if queued:
        logger.info("queued %d seller email(s) for %s on order %s",
                    queued, seller_event, order_row["order_number"])
    return queued
