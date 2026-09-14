"""Product reviews: public read + authenticated create/update/delete.

Mounted under /api/v1/store/products/{identifier}/reviews so the storefront
can fetch reviews for a product by slug or id, and signed-in buyers can
write exactly one (updatable) review per product.
"""
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, get_optional_user, optional_db_context, set_db_context
from core.exceptions import DomainException
from modules.reviews.models import ProductReview
from modules.reviews.schemas import ReviewCreate, ReviewOut, ReviewsResponse, ReviewSummary
from modules.users.models import User

router = APIRouter(prefix="/api/v1/store/products", tags=["reviews"])


async def _resolve_product_id(session: AsyncSession, identifier: str) -> Optional[str]:
    res = await session.execute(
        text("SELECT id FROM products WHERE id = :i OR slug = :i LIMIT 1"),
        {"i": identifier},
    )
    return res.scalar()


async def _has_purchased(session: AsyncSession, user_id: str, product_id: str) -> bool:
    res = await session.execute(
        text("""
            SELECT 1 FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.user_id = :uid AND oi.product_id = :pid
              AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
            LIMIT 1
        """),
        {"uid": user_id, "pid": product_id},
    )
    return res.scalar() is not None


def _to_out(r: ProductReview, author_name: Optional[str]) -> ReviewOut:
    return ReviewOut(
        id=r.id,
        rating=r.rating,
        title=r.title,
        body=r.body,
        verified_purchase=bool(r.verified_purchase),
        author_name=author_name,
        created_at=r.created_at,
    )


@router.get("/{identifier}/reviews", response_model=ReviewsResponse)
async def list_reviews(
    identifier: str,
    session: AsyncSession = Depends(optional_db_context),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Public: reviews + aggregate summary; the caller's own review (if any)
    is also returned as `mine` so the UI can offer edit/delete."""
    product_id = await _resolve_product_id(session, identifier)
    if not product_id:
        raise DomainException("Product not found", code="NOT_FOUND", status_code=404)

    agg = await session.execute(
        text("""
            SELECT COALESCE(AVG(rating), 0)::float, COUNT(*) FROM product_reviews
            WHERE product_id = :pid
        """),
        {"pid": product_id},
    )
    avg, count = agg.one()

    rows = await session.execute(
        text("""
            SELECT pr.id, pr.rating, pr.title, pr.body, pr.verified_purchase, pr.created_at,
                   COALESCE(NULLIF(u.first_name, '') || ' ' || NULLIF(u.last_name, ''),
                            split_part(u.email, '@', 1)) AS author_name,
                   pr.user_id
            FROM product_reviews pr
            LEFT JOIN users u ON u.id = pr.user_id
            WHERE pr.product_id = :pid
            ORDER BY pr.created_at DESC
            LIMIT 50
        """),
        {"pid": product_id},
    )
    mine = None
    items = []
    for r in rows:
        out = ReviewOut(
            id=r.id, rating=r.rating, title=r.title, body=r.body,
            verified_purchase=bool(r.verified_purchase),
            author_name=r.author_name or "Customer",
            created_at=r.created_at,
        )
        items.append(out)
        if current_user and r.user_id == current_user.id:
            mine = out

    return ReviewsResponse(summary=ReviewSummary(average=round(avg, 2) if count else None, count=count),
                            items=items, mine=mine)


@router.put("/{identifier}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def upsert_review(
    identifier: str,
    payload: ReviewCreate,
    session: AsyncSession = Depends(set_db_context),
    current_user: User = Depends(get_current_user),
):
    """Create or update the caller's single review for this product."""
    product_id = await _resolve_product_id(session, identifier)
    if not product_id:
        raise DomainException("Product not found", code="NOT_FOUND", status_code=404)

    verified = await _has_purchased(session, current_user.id, product_id)

    res = await session.execute(
        text("SELECT id FROM product_reviews WHERE user_id = :uid AND product_id = :pid"),
        {"uid": current_user.id, "pid": product_id},
    )
    existing_id = res.scalar()
    if existing_id:
        await session.execute(
            text("""
                UPDATE product_reviews
                SET rating = :rating, title = :title, body = :body,
                    verified_purchase = :verified, updated_at = now()
                WHERE id = :id
            """),
            {"rating": payload.rating, "title": payload.title, "body": payload.body,
             "verified": verified, "id": existing_id},
        )
        await session.commit()
        review = await session.get(ProductReview, existing_id)
        return _to_out(review, None)

    review = ProductReview(
        user_id=current_user.id,
        product_id=product_id,
        rating=payload.rating,
        title=payload.title,
        body=payload.body,
        verified_purchase=verified,
    )
    session.add(review)
    await session.commit()
    await session.refresh(review)
    return _to_out(review, None)


@router.delete("/{identifier}/reviews", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    identifier: str,
    session: AsyncSession = Depends(set_db_context),
    current_user: User = Depends(get_current_user),
):
    product_id = await _resolve_product_id(session, identifier)
    if not product_id:
        raise DomainException("Product not found", code="NOT_FOUND", status_code=404)
    res = await session.execute(
        text("DELETE FROM product_reviews WHERE user_id = :uid AND product_id = :pid"),
        {"uid": current_user.id, "pid": product_id},
    )
    if res.rowcount == 0:
        raise DomainException("Review not found", code="NOT_FOUND", status_code=404)
    await session.commit()
