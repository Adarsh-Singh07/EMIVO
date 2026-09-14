"""Marketing: customer segments + broadcast emails (with optional coupon).

Broadcasts are two-step: POST without confirm=true returns the audience
count (preview); with confirm=true the emails are enqueued through the
outbox (hello@ sender) and delivered by the worker.
"""
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import set_db_context
from core.dependencies import require_staff
from core.store import get_store_business_id

router = APIRouter(prefix="/api/v1/admin/marketing", tags=["Marketing"])

# Hard cap per broadcast — email volume must stay human-scale for a shop.
MAX_RECIPIENTS = 500

# Users considered "customers": no staff/owner/platform_admin membership.
_CUSTOMER_SQL = """
    NOT EXISTS (
        SELECT 1 FROM business_members bm
        WHERE bm.user_id = u.id
          AND bm.role IN ('platform_admin', 'owner', 'staff')
    )
"""

SEGMENTS = {
    "failed_payments_30d": (
        "Failed payments (30 days)",
        "Customers whose payment failed in the last 30 days — recover them with a nudge.",
        """
            FROM users u
            WHERE u.is_active AND u.deleted_at IS NULL
              AND EXISTS (
                SELECT 1 FROM payments pay
                JOIN orders o ON o.id = pay.order_id AND o.deleted_at IS NULL
                WHERE pay.user_id = u.id AND pay.status = 'FAILED'
                  AND pay.created_at > now() - interval '30 days'
              )
        """,
    ),
    "no_order_60d": (
        "No order in 60 days",
        "Registered customers who haven't completed an order in the last 60 days.",
        """
            FROM users u
            WHERE u.is_active AND u.deleted_at IS NULL
              AND (u.created_at < now() - interval '60 days'
                   OR EXISTS (SELECT 1 FROM orders o
                              WHERE o.user_id = u.id AND o.deleted_at IS NULL))
              AND NOT EXISTS (
                SELECT 1 FROM orders o
                WHERE o.user_id = u.id AND o.deleted_at IS NULL
                  AND o.created_at > now() - interval '60 days'
                  AND o.status NOT IN ('PENDING', 'PAYMENT_FAILED', 'CANCELLED')
              )
        """,
    ),
    "big_spenders": (
        "Big spenders",
        "Customers with lifetime paid revenue of ₹5,000 or more.",
        """
            FROM users u
            WHERE u.is_active AND u.deleted_at IS NULL
              AND (
                SELECT COALESCE(SUM(o.total), 0) FROM orders o
                WHERE o.user_id = u.id AND o.deleted_at IS NULL
                  AND o.status NOT IN ('PENDING', 'PAYMENT_FAILED', 'CANCELLED')
              ) >= 500000
        """,
    ),
    "all_customers": (
        "All customers",
        "Every registered customer account.",
        """
            FROM users u
            WHERE u.is_active AND u.deleted_at IS NULL
        """,
    ),
}


def _segment_sql(key: str, select_clause: str, extra_where: str = "") -> str:
    # Each fragment ends inside a WHERE; the customer exclusion joins with AND.
    return f"SELECT {select_clause} {SEGMENTS[key][2]} AND {_CUSTOMER_SQL} {extra_where}"


class SegmentInfo(BaseModel):
    key: str
    name: str
    description: str
    count: int


class SegmentPreview(BaseModel):
    key: str
    count: int
    sample: List[dict]


class CouponSpec(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, pattern=r"^[A-Z0-9_-]+$")
    discount_type: str = Field("PERCENTAGE", pattern="^(PERCENTAGE|FIXED_AMOUNT)$")
    discount_value: int = Field(..., ge=1, description="percent, or paise for fixed")
    min_order_amount: Optional[int] = Field(None, ge=0)
    end_date: Optional[str] = None


class BroadcastRequest(BaseModel):
    segment: str
    subject: str = Field(..., min_length=3, max_length=120)
    message: str = Field(..., min_length=10, max_length=4000)
    coupon: Optional[CouponSpec] = None
    confirm: bool = False


@router.get("/segments", response_model=List[SegmentInfo],
            dependencies=[Depends(require_staff)])
async def list_segments(session: AsyncSession = Depends(set_db_context)):
    out = []
    for key, (name, description, _) in SEGMENTS.items():
        count = (await session.execute(
            text(_segment_sql(key, "COUNT(*)"))
        )).scalar() or 0
        out.append(SegmentInfo(key=key, name=name, description=description,
                               count=int(count) if count <= MAX_RECIPIENTS else MAX_RECIPIENTS))
    return out


@router.get("/segments/{key}/preview", response_model=SegmentPreview,
            dependencies=[Depends(require_staff)])
async def preview_segment(key: str, limit: int = Query(10, ge=1, le=50),
                          session: AsyncSession = Depends(set_db_context)):
    if key not in SEGMENTS:
        raise HTTPException(status_code=404, detail="Unknown segment")
    rows = (await session.execute(
        text(_segment_sql(key, "u.id, u.email, u.first_name, u.last_name",
                          f"LIMIT {int(limit)}"))
    )).mappings().all()
    count = (await session.execute(text(_segment_sql(key, "COUNT(*)")))).scalar() or 0
    return SegmentPreview(
        key=key, count=int(count),
        sample=[{"email": r["email"], "name": (r["first_name"] or "").strip()}
                for r in rows],
    )


async def _ensure_coupon(session: AsyncSession, spec: CouponSpec, bid: str) -> None:
    """Create the coupon if it doesn't already exist (idempotent by code)."""
    exists = (await session.execute(
        text("SELECT 1 FROM coupons WHERE code = :code"), {"code": spec.code}
    )).scalar()
    if exists:
        return
    await session.execute(
        text("""
            INSERT INTO coupons (id, business_id, code, discount_type, discount_value,
                                 min_order_amount, start_date, end_date, is_active,
                                 per_user_limit, usage_limit, usage_count)
            VALUES (gen_random_uuid()::text, :bid, :code, CAST(:dtype AS discounttype), :dvalue,
                    :minorder, now(), :end, true, 1, NULL, 0)
        """),
        {"bid": bid, "code": spec.code, "dtype": spec.discount_type,
         "dvalue": spec.discount_value, "minorder": spec.min_order_amount,
         "end": spec.end_date},
    )


@router.post("/broadcasts", dependencies=[Depends(require_staff)])
async def create_broadcast(
    req: BroadcastRequest,
    session: AsyncSession = Depends(set_db_context),
):
    """Preview (confirm=false) or enqueue (confirm=true) a broadcast email to
    a segment. Optionally creates the coupon first, atomically with the
    outbox events."""
    if req.segment not in SEGMENTS:
        raise HTTPException(status_code=404, detail="Unknown segment")

    rows = (await session.execute(
        text(_segment_sql(req.segment, "u.id, u.email, u.first_name",
                          f"LIMIT {MAX_RECIPIENTS + 1}"))
    )).mappings().all()
    recipients = [dict(r) for r in rows]
    if len(recipients) > MAX_RECIPIENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Segment has more than {MAX_RECIPIENTS} recipients — narrow it down",
        )
    if not recipients:
        raise HTTPException(status_code=400, detail="Segment is empty")

    if not req.confirm:
        return {
            "confirm_required": True,
            "count": len(recipients),
            "sample": [{"email": r["email"]} for r in recipients[:5]],
            "coupon_code": req.coupon.code if req.coupon else None,
        }

    # --- confirmed send ---------------------------------------------------
    from core.models import OutboxEvent
    from core.redis import redis_manager

    bid = await get_store_business_id(session)
    if req.coupon:
        await _ensure_coupon(session, req.coupon, str(bid))

    coupon = req.coupon.model_dump() if req.coupon else None
    sent = 0
    for r in recipients:
        # Per-user dedupe: the same user never receives the same campaign
        # (segment+subject) twice, even across retries or re-clicks.
        dedup = f"broadcast:{req.segment}:{req.subject.lower().strip()[:60]}:{r['id']}"
        if not await redis_manager.client.set(dedup, "1", nx=True, ex=7 * 86400):
            continue
        session.add(OutboxEvent(
            tenant_id=None,
            type="marketing.broadcast",
            payload={
                "user_id": r["id"], "email": r["email"],
                "first_name": r["first_name"] or "",
                "subject": req.subject.strip(), "message": req.message.strip(),
                "coupon": coupon,
            },
        ))
        sent += 1
    await session.commit()
    return {"status": "queued", "queued": sent,
            "coupon_code": coupon["code"] if coupon else None}
