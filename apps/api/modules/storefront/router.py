from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import optional_db_context
from core.exceptions import DomainException
from modules.storefront.catalog import CatalogService
from modules.storefront.schemas import (
    SearchSuggestion,
    StoreCategory,
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


@router.get("/brands", response_model=List[str])
async def store_brands(service: CatalogService = Depends(_catalog)):
    return await service.brands()


@router.get("/config")
async def store_config(session: AsyncSession = Depends(optional_db_context)):
    """Public endpoint: returns store configuration the frontend needs.
    Notably exposes whether online payment is available (Cashfree configured).
    Never exposes secrets."""
    from core.config import settings
    from modules.orders.service import get_store_settings
    
    cashfree_configured = bool(
        settings.payment_provider == "cashfree"
        and settings.cashfree_client_id
        and settings.cashfree_client_secret.get_secret_value()
    )
    
    try:
        db_cfg = await get_store_settings(session)
    except Exception:
        db_cfg = {}
        
    return {
        "online_payment_available": cashfree_configured,
        "payment_provider": settings.payment_provider,
        "cod_enabled": db_cfg.get("cod_enabled", settings.cod_enabled),
        "cod_fee_paise": db_cfg.get("cod_fee_paise", settings.cod_fee_paise),
        "flat_shipping_paise": db_cfg.get("flat_shipping_paise", settings.flat_shipping_paise),
        "free_shipping_threshold_paise": db_cfg.get("free_shipping_threshold_paise", settings.free_shipping_threshold),
        "currency": "INR",
        "storefront_url": settings.storefront_url,
        "banner": db_cfg.get("banner"),
        "announcement": db_cfg.get("announcement"),
        "hero_slides": db_cfg.get("hero_slides", []),
        "promo_tiles": db_cfg.get("promo_tiles", []),
    }

from pydantic import BaseModel
class ContactForm(BaseModel):
    name: str
    email: str
    mobile: str
    subject: str
    message: str

@router.post("/contact")
async def handle_contact_form(form: ContactForm):
    from modules.notifications.providers import get_email_provider
    from core.config import settings
    
    provider = get_email_provider()
    
    # 1. Send query to support
    admin_subject = f"Support Request: {form.subject} (from {form.name})"
    admin_html = f"""
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> {form.name}</p>
    <p><strong>Email:</strong> {form.email}</p>
    <p><strong>Mobile:</strong> {form.mobile}</p>
    <p><strong>Subject:</strong> {form.subject}</p>
    <h3>Message:</h3>
    <p>{form.message}</p>
    """
    support_email = settings.email_from
    await provider.send_email(to_email=support_email, subject=admin_subject, html=admin_html)
    
    # 2. Send confirmation to user
    user_subject = f"We received your message: {form.subject}"
    user_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f3f4f6;">
            <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Apna Enterprises</h1>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="font-size: 18px; color: #111;">Hi {form.name},</h2>
            <p style="margin-bottom: 20px;">Thank you for contacting <strong>Apna Enterprises</strong>. We have received your message regarding "<strong>{form.subject}</strong>".</p>
            <p style="margin-bottom: 20px;">Our support team is reviewing your request and will get back to you within 24 hours.</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>For urgent queries:</strong><br>Please call us at +91 85398 38942</p>
            </div>
            <p style="margin: 0;">Best regards,<br><strong>The Apna Enterprises Support Team</strong></p>
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #f3f4f6;">
            Apna Enterprises | DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj, Bihar - 841508
        </div>
    </div>
    """
    await provider.send_email(to_email=form.email, subject=user_subject, html=user_html)
    
    return {"status": "ok"}
