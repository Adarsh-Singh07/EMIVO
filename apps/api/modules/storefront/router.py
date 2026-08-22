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
async def store_config():
    """Public endpoint: returns store configuration the frontend needs.
    Notably exposes whether online payment is available (Cashfree configured).
    Never exposes secrets."""
    from core.config import settings
    cashfree_configured = bool(
        settings.payment_provider == "cashfree"
        and settings.cashfree_client_id
        and settings.cashfree_client_secret.get_secret_value()
    )
    return {
        "online_payment_available": cashfree_configured,
        "payment_provider": settings.payment_provider,
        "cod_enabled": settings.cod_enabled,
        "cod_fee_paise": settings.cod_fee_paise,
        "flat_shipping_paise": settings.flat_shipping_paise,
        "free_shipping_threshold_paise": settings.free_shipping_threshold,
        "currency": "INR",
        "storefront_url": settings.storefront_url,
    }
