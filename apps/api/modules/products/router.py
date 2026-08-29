from typing import Any, List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_db_session, set_db_context, require_roles, optional_db_context, get_optional_user
from modules.users.models import User
from modules.products.schemas import (
    ProductCreate, ProductResponse, ProductUpdate,
    ProductVariantCreate, ProductVariantResponse, ProductVariantUpdate,
    ProductMediaCreate, ProductMediaResponse,
    CategoryCreate, CategoryResponse, CategoryUpdate,
    AIGenerateRequest, AIGenerateResponse,
)
from modules.products.service import ProductService

router = APIRouter(prefix="/api/v1/products", tags=["Products"])

STAFF = ["platform_admin", "owner", "staff"]


async def get_product_service(
    session: AsyncSession = Depends(set_db_context)
) -> ProductService:
    return ProductService(session)


async def get_public_product_service(
    session: AsyncSession = Depends(optional_db_context)
) -> ProductService:
    """Public product service — works with or without auth (for storefront)."""
    return ProductService(session)


# --------------------------------------------------------------------------
# Admin CRUD (staff) — storefront catalog endpoints live in modules/storefront
# --------------------------------------------------------------------------


from modules.products.ai_service import AIProductService

@router.post("/ai/generate", response_model=AIGenerateResponse)
async def generate_ai_details(
    payload: AIGenerateRequest,
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    ai_service = AIProductService()
    try:
        result = await ai_service.generate_product_details(
            name=payload.name,
            brand=payload.brand,
            existing_desc=payload.existing_description
        )
        return AIGenerateResponse(
            description=result["description"],
            specs=result["specs"]
        )
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.create_product(payload)


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    service: ProductService = Depends(get_public_product_service),
    current_user: Optional[User] = Depends(get_optional_user)
) -> Any:
    """List products — public endpoint, no auth required for storefront browsing."""
    return await service.list_products(limit=limit, offset=offset, search=search)


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
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.update_product(product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> None:
    """Archive (soft-delete) a product."""
    await service.delete_product(product_id)


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
async def add_variant(
    product_id: str,
    payload: ProductVariantCreate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.add_variant(product_id, payload)


@router.put("/variants/{variant_id}", response_model=ProductVariantResponse)
async def update_variant(
    variant_id: str,
    payload: ProductVariantUpdate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.update_variant(variant_id, payload)


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> None:
    await service.delete_variant(variant_id)


@router.post("/{product_id}/media", response_model=ProductMediaResponse, status_code=status.HTTP_201_CREATED)
async def add_media(
    product_id: str,
    payload: ProductMediaCreate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.add_media(product_id, payload)


@router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> None:
    await service.delete_media(media_id)


@router.post("/{product_id}/media/reorder", response_model=ProductResponse)
async def reorder_media(
    product_id: str,
    media_ids: List[str],
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.reorder_media(product_id, media_ids)


# --------------------------------------------------------------------------
# Categories (admin CRUD)
# --------------------------------------------------------------------------

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.create_category(payload)

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> Any:
    return await service.update_category(category_id, payload)

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: User = Depends(require_roles(STAFF))
) -> None:
    await service.delete_category(category_id)
