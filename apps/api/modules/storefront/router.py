from fastapi import Depends
from core.database import get_db_session
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import optional_db_context
from core.exceptions import DomainException
from modules.storefront.catalog import CatalogService
from modules.storefront.schemas import (
    SearchSuggestion,
    StoreBrandFacet,
    StoreCategory,
    StoreCategoryPage,
    StoreProduct,
    StoreProductList,
)

router = APIRouter(prefix="/api/v1/store", tags=["storefront"])


def _catalog(session: AsyncSession = Depends(optional_db_context)) -> CatalogService:
    return CatalogService(session)


@router.get("/products", response_model=StoreProductList)
async def list_store_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[int] = Query(default=None, ge=0, description="paise"),
    max_price: Optional[int] = Query(default=None, ge=0, description="paise"),
    featured: bool = False,
    in_stock: bool = False,
    sort: str = Query("relevance", pattern="^(relevance|price_asc|price_desc|newest|name|discount)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    service: CatalogService = Depends(_catalog),
):
    """Public storefront catalog with server-computed effective pricing + stock."""
    return await service.list_products(
        q=q, category=category, brand=brand, min_price=min_price, max_price=max_price,
        featured_only=featured, in_stock_only=in_stock, sort=sort, page=page, page_size=page_size,
    )


@router.get("/products/search", response_model=List[SearchSuggestion])
async def search_suggestions(
    q: str = Query(..., min_length=2, max_length=100),
    service: CatalogService = Depends(_catalog),
):
    return await service.search_suggestions(q)


@router.get("/products/{identifier}", response_model=StoreProduct)
async def get_store_product(identifier: str, service: CatalogService = Depends(_catalog)):
    product = await service.get_product(identifier)
    if not product:
        raise DomainException("Product not found", code="NOT_FOUND", status_code=404)
    return product


@router.get("/products/{identifier}/related", response_model=List[StoreProduct])
async def related_products(
    identifier: str,
    limit: int = Query(8, ge=1, le=20),
    service: CatalogService = Depends(_catalog),
):
    product = await service.get_product(identifier)
    if not product:
        raise DomainException("Product not found", code="NOT_FOUND", status_code=404)
    return await service.related_products(product.id, limit)


@router.get("/categories", response_model=List[StoreCategory])
async def store_categories(service: CatalogService = Depends(_catalog)):
    return await service.categories()


@router.get("/brands", response_model=List[StoreBrandFacet])
async def store_brands(
    category: Optional[str] = Query(default=None, description="category slug or id to scope the brand facet"),
    service: CatalogService = Depends(_catalog),
):
    """Brand facet — all brands, or scoped to a category tree when `category` is set."""
    return await service.brands(category)


@router.get("/category-pages/{slug}", response_model=StoreCategoryPage)
async def store_category_page(
    slug: str,
    service: CatalogService = Depends(_catalog),
):
    """Flipkart-style category landing payload: node, children, brand facet,
    auto price buckets, featured products, and admin overrides."""
    page = await service.category_page(slug)
    if not page:
        raise DomainException("Category not found", code="NOT_FOUND", status_code=404)
    return page


@router.get("/config")
async def store_config(session: AsyncSession = Depends(optional_db_context)):
    """Public endpoint: returns store configuration the frontend needs.
    Notably exposes whether online payment is available (Cashfree configured).
    Never exposes secrets."""
    from core.config import settings
    from modules.orders.service import get_store_settings
    
    # Multi-gateway: each gateway is available when ITS keys are configured;
    # which one customers actually use is the admin default (below), not a
    # buyer choice — the checkout no longer shows a gateway chooser.
    cashfree_configured = bool(
        settings.cashfree_client_id
        and settings.cashfree_client_secret.get_secret_value()
    )
    easebuzz_configured = bool(
        settings.easebuzz_merchant_key
        and settings.easebuzz_salt.get_secret_value()
    )

    try:
        db_cfg = await get_store_settings(session)
    except Exception as e:
        import logging; logging.error("COUPONS ERROR: " + repr(e))
        db_cfg = {}
        
    # Default gateway customers pay through: admin-persisted choice first,
    # then env PAYMENT_PROVIDER, then any configured gateway (cashfree first).
    # The storefront no longer offers a chooser — it just follows this default.
    configured_map = {"cashfree": cashfree_configured, "easebuzz": easebuzz_configured}
    admin_default = str(db_cfg.get("default_gateway") or "").lower()
    env_default = (settings.payment_provider or "mock").lower()
    default_gateway = None
    # Same semantics as PaymentService._default_gateway: admin choice first,
    # then the env default; an explicit env "mock" is a dev/test signal and
    # does NOT pull a configured gateway in as the default.
    candidates = [admin_default, env_default]
    if env_default != "mock":
        candidates += [c for c in ("cashfree", "easebuzz") if c != env_default]
    for cand in candidates:
        if cand in configured_map and configured_map[cand]:
            default_gateway = cand
            break

    return {
        "online_payment_available": cashfree_configured or easebuzz_configured,
        "payment_provider": settings.payment_provider,
        # Effective default gateway (admin choice > env > any configured).
        "default_gateway": default_gateway,
        "default_gateway_available": default_gateway is not None,
        # Per-gateway availability (admin status display + fallback logic).
        "easebuzz_available": easebuzz_configured,
        "cashfree_available": cashfree_configured,
        "cashfree_sandbox": settings.cashfree_environment.lower() == "sandbox",
        "cod_enabled": db_cfg.get("cod_enabled", settings.cod_enabled),
        "cod_fee_paise": db_cfg.get("cod_fee_paise", settings.cod_fee_paise),
        "flat_shipping_paise": db_cfg.get("flat_shipping_paise", settings.flat_shipping_paise),
        "min_order_paise": db_cfg.get("min_order_paise", 0) or 0,
        "free_shipping_threshold_paise": db_cfg.get("free_shipping_threshold_paise", settings.free_shipping_threshold),
        "currency": "INR",
        "storefront_url": settings.storefront_url,
        "banner_active": (db_cfg.get("banner") or {}).get("active"),
        "banner_title": (db_cfg.get("banner") or {}).get("title"),
        "banner_subtitle": (db_cfg.get("banner") or {}).get("subtitle"),
        "banner_image": (db_cfg.get("banner") or {}).get("image_url"),
        "banner_link": (db_cfg.get("banner") or {}).get("link"),
        # Optional display window (ISO dates) — the storefront auto-hides the
        # banner outside it, so seasonal promos can't go stale.
        "banner_starts_at": (db_cfg.get("banner") or {}).get("starts_at"),
        "banner_ends_at": (db_cfg.get("banner") or {}).get("ends_at"),
        "announcement": db_cfg.get("announcement"),
        "hero_slides": db_cfg.get("hero_slides", []),
        "promo_tiles": db_cfg.get("promo_tiles", []),
        "category_pages": db_cfg.get("category_pages", {}),
    }

@router.get("/shipping-estimate")
async def shipping_estimate(
    pincode: str = Query(..., min_length=6, max_length=6, pattern=r"^\d{6}$"),
    origin_pincode: Optional[str] = Query(None, min_length=6, max_length=6, pattern=r"^\d{6}$"),
    session=Depends(get_db_session)
):
    from modules.storefront.shipping import get_delhivery_estimate
    from modules.orders.service import get_store_settings
    from core.config import settings
    db_cfg = await get_store_settings(session)
    cod_enabled = db_cfg.get("cod_enabled", settings.cod_enabled)
    return await get_delhivery_estimate(pincode, origin_pincode=origin_pincode, is_store_cod_enabled=cod_enabled)


@router.get("/reverse-geocode")
async def reverse_geocode_endpoint(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    session=Depends(get_db_session)
):
    from modules.storefront.shipping import reverse_geocode_location
    from modules.orders.service import get_store_settings
    from core.config import settings
    db_cfg = await get_store_settings(session)
    cod_enabled = db_cfg.get("cod_enabled", settings.cod_enabled)
    return await reverse_geocode_location(lat, lon, is_store_cod_enabled=cod_enabled)

from pydantic import BaseModel, EmailStr, Field
class ContactForm(BaseModel):
    # Bounded, validated fields — this endpoint is unauthenticated and emails
    # attacker-chosen addresses, so without limits it is an open spam relay.
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    mobile: str = Field(..., min_length=6, max_length=20, pattern=r"^[0-9+\-\s()]+$")
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)

    def esc(self, v: str) -> str:
        """HTML-escape before embedding user text into email bodies."""
        from html import escape
        return escape(v)

@router.post("/contact")
async def handle_contact_form(form: ContactForm):
    from modules.notifications.providers import get_email_provider
    from core.config import settings
    
    provider = get_email_provider()

    # 1. Send query to support (user text HTML-escaped — the support mailbox
    # is rendered as HTML and must not become an injection target)
    from modules.notifications.templates import _shell
    from modules.notifications.aliases import (
        ALIAS_SUPPORT,
        ALIAS_TRANSACTIONAL,
        CONTACT_INBOX,
    )
    message_html = form.esc(form.message).replace("\n", "<br/>")
    detail_rows = "".join(
        f"<tr><td style='padding:8px 4px;border-bottom:1px solid #e4e4e7;color:#71717a;"
        f"font-size:13px;white-space:nowrap;'>{k}</td>"
        f"<td style='padding:8px 4px;border-bottom:1px solid #e4e4e7;color:#0a0a0a;"
        f"font-size:13px;text-align:right;'>{v}</td></tr>"
        for k, v in (
            ("Name", form.esc(form.name)),
            ("Email", form.esc(form.email)),
            ("Mobile", form.esc(form.mobile)),
            ("Subject", form.esc(form.subject)),
        )
    )
    admin_html = _shell(
        "New contact form submission",
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' "
        "style='border:1px solid #e4e4e7;border-radius:12px;border-collapse:separate;"
        f"margin:6px 0 14px;'>{detail_rows}</table>"
        "<div style='margin:0;background:#fafafa;border:1px solid #e4e4e7;"
        "border-radius:12px;padding:14px 18px;font-size:14px;line-height:1.6;"
        f"color:#3f3f46;'>{message_html}</div>",
        preheader=f"Support request from {form.esc(form.name)}: {form.esc(form.subject)}",
        pill=("SUPPORT REQUEST", "#b45309"),
    )
    admin_subject = f"Support Request: {form.esc(form.subject)} (from {form.esc(form.name)})"

    # Submissions land in the contact@ inbox; Reply-To is the customer so
    # staff can answer by simply hitting reply. Sent as no-reply@ (it is an
    # automated relay of the form, not a reply).
    await provider.send_email(
        to_email=CONTACT_INBOX,
        subject=admin_subject,
        html=admin_html,
        from_address=ALIAS_TRANSACTIONAL,
        reply_to=form.email,
    )

    # 2. Send confirmation to the address the user typed. The subject and
    # name are escaped and the body is fully template-controlled except for
    # the escaped name — a verified user copy would be a spam relay, so this
    # stays a fixed template.
    user_subject = f"We received your message: {form.esc(form.subject)}"
    user_html = _shell(
        "Thanks for reaching out",
        f"Hi <b style='color:#0a0a0a;'>{form.esc(form.name)}</b>, thank you for contacting "
        f"<b style='color:#0a0a0a;'>ELEKTRIX</b>. We have received your message about "
        "&ldquo;<b style='color:#0a0a0a;'>" + form.esc(form.subject) + "</b>&rdquo; and our "
        "support team will get back to you within 24 hours."
        "<div style='margin:18px 0 0;background:#fafafa;border:1px solid #e4e4e7;"
        "border-radius:12px;padding:14px 18px;font-size:14px;color:#3f3f46;'>"
        "<b style='color:#0a0a0a;'>Need something urgent?</b><br/>"
        "Call us at <a href='tel:+918092024066' style='color:#0a0a0a;font-weight:600;"
        "text-decoration:none;'>+91 80920 24066</a> (9 AM – 8 PM IST).</div>",
        preheader=f"We received your message — our team replies within 24 hours.",
        pill=("MESSAGE RECEIVED", "#059669"),
    )
    # Confirmation comes from the support desk identity — the mail promises a
    # human reply within 24 hours, so it should wear that sender.
    await provider.send_email(
        to_email=form.email, subject=user_subject, html=user_html, from_address=ALIAS_SUPPORT
    )

    return {"status": "ok"}


@router.get("/coupons")
async def public_coupons(session: AsyncSession = Depends(optional_db_context)):
    from sqlalchemy import text
    try:
        bid = await session.execute(text("SELECT current_setting('app.business_id', true)"))
        import logging; logging.warning(f"BUSINESS_ID IN COUPONS ROUTE: {bid.scalar()}")
        query = text("""
            SELECT code, description, discount_type, discount_value, min_order_amount, max_discount_amount, terms_conditions 
            FROM coupons 
            WHERE is_active = true 
            AND deleted_at IS NULL
            AND (start_date IS NULL OR start_date <= now()) 
            AND (end_date IS NULL OR end_date >= now())
        """)
        result = await session.execute(query)
        return [{**dict(row._mapping), 'discount_type': str(row._mapping['discount_type'].value) if hasattr(row._mapping['discount_type'], 'value') else str(row._mapping['discount_type'])} for row in result.fetchall()]
    except Exception as e:
        import logging; logging.error("COUPONS ERROR: " + repr(e))
        return []
