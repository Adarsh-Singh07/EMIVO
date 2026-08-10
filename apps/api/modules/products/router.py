from typing import Any, List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_db_session, set_db_context, require_roles, optional_db_context, get_optional_user
from modules.users.models import User
from modules.products.schemas import (
    ProductCreate, ProductResponse, ProductUpdate,
    ProductVariantCreate, ProductVariantResponse,
    ProductMediaCreate, ProductMediaResponse
)
from modules.products.service import ProductService

router = APIRouter(prefix="/api/v1/products", tags=["Products"])


async def get_product_service(
    session: AsyncSession = Depends(set_db_context)
) -> ProductService:
    return ProductService(session)


async def get_public_product_service(
    session: AsyncSession = Depends(optional_db_context)
) -> ProductService:
    """Public product service — works with or without auth (for storefront)."""
    return ProductService(session)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"]))
) -> Any:
    return await service.create_product(payload)


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ProductService = Depends(get_public_product_service),
    current_user: Optional[User] = Depends(get_optional_user)
) -> Any:
    """List products — public endpoint, no auth required for storefront browsing."""
    return await service.list_products(limit=limit, offset=offset)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    service: ProductService = Depends(get_public_product_service),
    current_user: Optional[User] = Depends(get_optional_user)
) -> Any:
    """Get single product — public endpoint, no auth required for storefront."""
    return await service.get_product(product_id)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"]))
) -> Any:
    return await service.update_product(product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner"]))
) -> None:
    await service.delete_product(product_id)


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
async def add_variant(
    product_id: str,
    payload: ProductVariantCreate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"]))
) -> Any:
    return await service.add_variant(product_id, payload)


@router.post("/{product_id}/media", response_model=ProductMediaResponse, status_code=status.HTTP_201_CREATED)
async def add_media(
    product_id: str,
    payload: ProductMediaCreate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"]))
) -> Any:
    return await service.add_media(product_id, payload)
