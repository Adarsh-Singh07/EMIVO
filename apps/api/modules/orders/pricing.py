"""Single source of truth for effective price computation.

Rule: sale_price when a festival offer window is active, else price.
The identical rule is expressed in SQL in modules/storefront/catalog.py
(EFFECTIVE_PRICE_SQL) — tests assert both agree.
"""
from datetime import datetime, timezone
from typing import Optional


def is_offer_active(sale_price: Optional[int], starts_at, ends_at,
                    now: Optional[datetime] = None) -> bool:
    if sale_price is None or sale_price <= 0:
        return False
    now = now or datetime.now(timezone.utc)
    if starts_at is None:
        return False  # an offer must have a start (no accidental forever-offers)
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)
    if starts_at > now:
        return False
    if ends_at is not None:
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        if ends_at < now:
            return False
    return True


def effective_price(product, now: Optional[datetime] = None) -> int:
    """Return the price the customer pays for a product (paise)."""
    if is_offer_active(product.sale_price, product.offer_starts_at, product.offer_ends_at, now):
        return product.sale_price
    return product.price


def discount_percent(product, eff_price: Optional[int] = None) -> int:
    eff = eff_price if eff_price is not None else effective_price(product)
    mrp = product.mrp if product.mrp and product.mrp > 0 else product.price
    if mrp <= 0:
        return 0
    return max(int(round((mrp - eff) / mrp * 100)), 0)
