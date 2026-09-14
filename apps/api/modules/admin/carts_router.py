"""Admin view of abandoned carts: list idle carts with items + value, and a
manual nudge that enqueues the same cart.reminder outbox event the hourly
worker uses — respecting per-cart Redis dedupe so nobody gets spammed."""
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import set_db_context
from core.dependencies import require_staff
from core.redis import redis_manager

router = APIRouter(prefix="/api/v1/admin/abandoned-carts", tags=["AbandonedCarts"])

# Carts idle longer than this show up in the list.
IDLE_MINUTES_DEFAULT = 30
# Cap the lookback so ancient stale carts never flood the table.
LOOKBACK_DAYS = 7
# One manual nudge per cart per window — mirrors the worker's per-stage dedupe.
MANUAL_NUDGE_DEDUPE_TTL = 6 * 3600


class AbandonedCartItem(BaseModel):
    name: str
    quantity: int
    unit_price: int  # paise


class AbandonedCart(BaseModel):
    id: str
    customer_name: Optional[str] = None
    email: Optional[str] = None
    is_guest: bool
    subtotal: int  # paise
    items: List[AbandonedCartItem]
    updated_at: Any


def _cart_rows_sql(idle_minutes: int, limit: int) -> str:
    # cart_items has no denormalized product columns — join products.
    return f"""
        SELECT c.id, c.subtotal, c.updated_at, c.user_id,
               COALESCE(u.first_name || ' ' || u.last_name, '') AS customer_name,
               COALESCE(u.email, '') AS email,
               (SELECT COALESCE(json_agg(json_build_object(
                            'name', p.name, 'quantity', ci.quantity, 'unit_price', p.price)), '[]'::json)
                FROM cart_items ci
                JOIN products p ON p.id = ci.product_id
                WHERE ci.cart_id = c.id) AS items
        FROM carts c
        LEFT JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
        WHERE c.updated_at < now() - make_interval(mins => :minutes)
          AND c.updated_at > now() - interval '{LOOKBACK_DAYS} days'
          AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
        ORDER BY c.updated_at DESC
        LIMIT :lim
    """


@router.get("", response_model=List[AbandonedCart], dependencies=[Depends(require_staff)])
async def list_abandoned_carts(
    minutes: int = Query(IDLE_MINUTES_DEFAULT, ge=5, le=10080),
    limit: int = Query(100, ge=1, le=200),
    session: AsyncSession = Depends(set_db_context),
):
    """Carts idle for at least `minutes` with items still in them, newest
    activity first. Value comes from the stored cart subtotal (paise)."""
    rows = (await session.execute(
        text(_cart_rows_sql(minutes, limit)),
        {"minutes": minutes, "lim": limit},
    )).mappings().all()
    return [
        AbandonedCart(
            id=r["id"],
            customer_name=(r["customer_name"] or "").strip() or None,
            email=r["email"] or None,
            is_guest=r["user_id"] is None,
            subtotal=r["subtotal"] or 0,
            items=[AbandonedCartItem(**i) for i in (r["items"] or [])],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.post("/{cart_id}/nudge", dependencies=[Depends(require_staff)])
async def nudge_abandoned_cart(
    cart_id: str,
    session: AsyncSession = Depends(set_db_context),
):
    """Manually send the abandoned-cart reminder email. Registered customers
    only (guest carts have no inbox); at most one nudge per cart per 6 hours."""
    r = (await session.execute(
        text("""
            SELECT c.id, c.user_id, c.updated_at,
                   COALESCE(u.email, '') AS email, COALESCE(u.first_name, '') AS first_name,
                   (SELECT COALESCE(json_agg(json_build_object(
                                'name', p.name, 'unit_price', p.price)), '[]'::json)
                    FROM cart_items ci
                    JOIN products p ON p.id = ci.product_id
                    WHERE ci.cart_id = c.id) AS items
            FROM carts c
            LEFT JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
            WHERE c.id = :cid
              AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
        """),
        {"cid": cart_id},
    )).mappings().first()
    if not r:
        raise HTTPException(status_code=404, detail="Cart not found or already emptied")
    if not r["email"]:
        raise HTTPException(status_code=400, detail="Guest carts have no email address to nudge")

    # Same dedupe family as the worker, separate stage so a manual nudge does
    # not consume the automatic 30-min/3-day sends (and vice versa).
    dedup = f"cartrem:{cart_id}:manual"
    if not await redis_manager.client.set(dedup, "1", nx=True, ex=MANUAL_NUDGE_DEDUPE_TTL):
        raise HTTPException(status_code=429, detail="This cart was nudged recently — try later")

    from core.models import OutboxEvent
    session.add(OutboxEvent(
        tenant_id=None,
        type="cart.reminder",
        payload={
            "user_id": r["user_id"],
            "email": r["email"],
            "first_name": r["first_name"],
            "items": r["items"] or [],
            "stage": "manual",
        },
    ))
    await session.commit()
    return {"status": "queued", "email": r["email"]}
