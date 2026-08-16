"""Resolve the canonical ELEKTRIX store tenant.

v0.2 runs a single storefront over the multi-tenant schema: all customer-facing
flows (catalog, cart, checkout, orders) operate on the store business. Seller
marketplaces (v1.1) will add per-seller business contexts without schema changes.
"""
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from modules.businesses.models import Business

_cached_store_business_id: str | None = None


async def get_store_business_id(session: AsyncSession) -> str:
    """Return the canonical store business id (env override first, DB lookup second).

    The result is cached per-process; the value is immutable for a deployment.
    """
    global _cached_store_business_id
    if _cached_store_business_id:
        return _cached_store_business_id

    if settings.store_business_id:
        _cached_store_business_id = settings.store_business_id
        return _cached_store_business_id

    # Resolve by exact name — the seed script guarantees 'ELEKTRIX' exists.
    # This query runs as the session's current role; businesses RLS allows
    # reads for members only, so resolve via a fresh unrestricted session.
    from core.database import async_session_maker

    async with async_session_maker() as root_session:
        res = await root_session.execute(
            select(Business.id).where(Business.name == "ELEKTRIX").limit(1)
        )
        found = res.scalar_one_or_none()
        if not found:
            raise RuntimeError(
                "Canonical ELEKTRIX store business not found. "
                "Run scripts/seed_store.py or set STORE_BUSINESS_ID."
            )
        _cached_store_business_id = str(found)
        return _cached_store_business_id


def reset_store_business_cache() -> None:
    global _cached_store_business_id
    _cached_store_business_id = None


# Default commerce rules; admin-editable overrides live in business_settings
# config["store"] for the store business.
DEFAULT_STORE_SETTINGS: dict = {
    "cod_enabled": None,            # None -> fall back to settings.cod_enabled env
    "cod_fee_paise": None,
    "cod_max_order_paise": None,
    "free_shipping_threshold_paise": None,
    "flat_shipping_paise": None,
    "banner": None,                 # {title, subtitle, image_url, link, active}
    "announcement": None,           # header strip text
}


async def get_store_settings(session: AsyncSession) -> dict:
    """Merge order: env defaults <- business_settings.config['store']."""
    from sqlalchemy import text as _text

    store_id = await get_store_business_id(session)
    res = await session.execute(
        _text("SELECT config FROM business_settings WHERE business_id = :bid"),
        {"bid": store_id},
    )
    config = res.scalar() or {}
    store_cfg = config.get("store") or {}

    return {
        "cod_enabled": store_cfg.get("cod_enabled", settings.cod_enabled),
        "cod_fee_paise": store_cfg.get("cod_fee_paise", settings.cod_fee_paise),
        "cod_max_order_paise": store_cfg.get("cod_max_order_paise", settings.cod_max_order_paise),
        "free_shipping_threshold_paise": store_cfg.get(
            "free_shipping_threshold_paise", settings.free_shipping_threshold
        ),
        "flat_shipping_paise": store_cfg.get("flat_shipping_paise", settings.flat_shipping_paise),
        "banner": store_cfg.get("banner"),
        "announcement": store_cfg.get("announcement"),
    }
