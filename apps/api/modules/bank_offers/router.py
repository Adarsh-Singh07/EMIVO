"""Bank offers — admin CRUD + public storefront endpoint.

Bank offers are informational merchandising ("10% instant discount with HDFC
credit cards"): the discount settles on the bank's side during payment, so
nothing here touches order pricing or totals. The public payload carries
product_ids so the PDP and checkout can filter eligibility client-side; an
offer with no linked products is sitewide.
"""
import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import optional_db_context, require_staff, set_db_context
from core.store import get_store_business_id
from modules.bank_offers.schemas import BankOfferCreate, BankOfferResponse, BankOfferUpdate

router = APIRouter()
admin_router = APIRouter()

_COLS = """bo.id, bo.bank_name, bo.card_type, bo.discount_text, bo.poster_url,
           bo.link, bo.starts_at, bo.ends_at, bo.position, bo.is_active,
           COALESCE(
               array_agg(bop.product_id) FILTER (WHERE bop.product_id IS NOT NULL),
               ARRAY[]::varchar[]
           ) AS product_ids"""
_FROM = "FROM bank_offers bo LEFT JOIN bank_offers_products bop ON bop.bank_offer_id = bo.id"
_IN_WINDOW = """(bo.starts_at IS NULL OR bo.starts_at <= now())
                AND (bo.ends_at IS NULL OR bo.ends_at >= now())"""


def _offer_dict(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "bank_name": row.bank_name,
        "card_type": row.card_type,
        "discount_text": row.discount_text,
        "poster_url": row.poster_url,
        "link": row.link,
        "starts_at": row.starts_at,
        "ends_at": row.ends_at,
        "position": row.position,
        "is_active": bool(row.is_active),
        "product_ids": list(row.product_ids or []),
    }


async def _get_offer(session: AsyncSession, offer_id: str, bid: str) -> Dict[str, Any] | None:
    res = await session.execute(
        text(f"SELECT {_COLS} {_FROM} WHERE bo.id = :oid AND bo.business_id = :bid GROUP BY bo.id"),
        {"oid": offer_id, "bid": bid},
    )
    row = res.first()
    return _offer_dict(row) if row else None


async def _rebind_rls(session: AsyncSession, bid: str) -> None:
    # Transaction-local GUCs and SET LOCAL ROLE are dropped at commit —
    # re-establish the emivo_app context before any post-commit query.
    await session.execute(text("SET LOCAL ROLE emivo_app"))
    await session.execute(
        text("SELECT set_config('app.business_id', :bid, true)"), {"bid": bid}
    )


async def _link_products(
    session: AsyncSession, offer_id: str, bid: str, product_ids: List[str]
) -> None:
    """Replace the eligibility join rows, keeping only ids that exist."""
    await session.execute(
        text("DELETE FROM bank_offers_products WHERE bank_offer_id = :oid"),
        {"oid": offer_id},
    )
    # Cast the column, not the bind param — asyncpg rejects ::type on params.
    ids = list(dict.fromkeys(product_ids or []))
    if not ids:
        return
    await session.execute(
        text("""
            INSERT INTO bank_offers_products (bank_offer_id, product_id, business_id)
            SELECT :oid, p.id, :bid
            FROM products p
            WHERE p.id::text = ANY(:ids)
        """),
        {"oid": offer_id, "bid": bid, "ids": ids},
    )


def _params(offer_id: str, bid: str, data: BankOfferCreate) -> Dict[str, Any]:
    return {
        "id": offer_id,
        "bid": bid,
        "bank_name": data.bank_name.strip(),
        "card_type": data.card_type,
        "discount_text": data.discount_text.strip(),
        "poster_url": data.poster_url or None,
        "link": data.link or None,
        "starts_at": data.starts_at,
        "ends_at": data.ends_at,
        "position": data.position,
        "is_active": data.is_active,
    }


# --------------------------------------------------------------------------
# Public storefront
# --------------------------------------------------------------------------

@router.get("/bank-offers", response_model=List[BankOfferResponse])
async def public_bank_offers(session: AsyncSession = Depends(optional_db_context)):
    """Active, in-window offers ordered by position. Includes product_ids so
    the storefront can decide eligibility (empty list = sitewide)."""
    bid = await get_store_business_id(session)
    res = await session.execute(
        text(
            f"SELECT {_COLS} {_FROM} "
            f"WHERE bo.business_id = :bid AND bo.is_active AND {_IN_WINDOW} "
            f"GROUP BY bo.id ORDER BY bo.position ASC, bo.created_at ASC"
        ),
        {"bid": bid},
    )
    return [_offer_dict(r) for r in res.all()]


# --------------------------------------------------------------------------
# Admin CRUD
# --------------------------------------------------------------------------

@admin_router.get("/bank-offers", response_model=List[BankOfferResponse],
                  dependencies=[Depends(require_staff)])
async def list_bank_offers(session: AsyncSession = Depends(set_db_context)):
    bid = await get_store_business_id(session)
    res = await session.execute(
        text(
            f"SELECT {_COLS} {_FROM} WHERE bo.business_id = :bid "
            f"GROUP BY bo.id ORDER BY bo.position ASC, bo.created_at ASC"
        ),
        {"bid": bid},
    )
    return [_offer_dict(r) for r in res.all()]


@admin_router.post("/bank-offers", response_model=BankOfferResponse,
                   status_code=status.HTTP_201_CREATED,
                   dependencies=[Depends(require_staff)])
async def create_bank_offer(
    data: BankOfferCreate, session: AsyncSession = Depends(set_db_context)
):
    bid = await get_store_business_id(session)
    offer_id = str(uuid.uuid4())
    await session.execute(
        text("""
            INSERT INTO bank_offers (id, business_id, bank_name, card_type, discount_text,
                                     poster_url, link, starts_at, ends_at, position, is_active)
            VALUES (:id, :bid, :bank_name, :card_type, :discount_text,
                    :poster_url, :link, :starts_at, :ends_at, :position, :is_active)
        """),
        _params(offer_id, bid, data),
    )
    await _link_products(session, offer_id, bid, data.product_ids)
    await session.commit()
    await _rebind_rls(session, bid)
    offer = await _get_offer(session, offer_id, bid)
    assert offer is not None  # inserted and committed in this request
    return offer


@admin_router.put("/bank-offers/{offer_id}", response_model=BankOfferResponse,
                  dependencies=[Depends(require_staff)])
async def update_bank_offer(
    offer_id: str, data: BankOfferUpdate, session: AsyncSession = Depends(set_db_context)
):
    bid = await get_store_business_id(session)
    res = await session.execute(
        text("""
            UPDATE bank_offers
            SET bank_name = :bank_name, card_type = :card_type, discount_text = :discount_text,
                poster_url = :poster_url, link = :link, starts_at = :starts_at, ends_at = :ends_at,
                position = :position, is_active = :is_active, updated_at = now()
            WHERE id = :id AND business_id = :bid
        """),
        _params(offer_id, bid, data),
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Bank offer not found")
    await _link_products(session, offer_id, bid, data.product_ids)
    await session.commit()
    await _rebind_rls(session, bid)
    offer = await _get_offer(session, offer_id, bid)
    assert offer is not None  # the UPDATE above matched this request's tenant
    return offer


@admin_router.delete("/bank-offers/{offer_id}", dependencies=[Depends(require_staff)])
async def delete_bank_offer(offer_id: str, session: AsyncSession = Depends(set_db_context)):
    bid = await get_store_business_id(session)
    res = await session.execute(
        text("DELETE FROM bank_offers WHERE id = :id AND business_id = :bid"),
        {"id": offer_id, "bid": bid},
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Bank offer not found")
    await session.commit()
    return {"ok": True}
