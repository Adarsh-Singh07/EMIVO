from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

# DB dependency placeholder (in actual setup, comes from core.database)
from core.database import get_db

from . import schemas, service

router = APIRouter(prefix="/products", tags=["Products & Catalog"])


def get_business_id(x_business_id: str = Header(..., alias="X-Business-ID")) -> str:
    """Multi-tenant isolation header context extraction"""
    if not x_business_id:
        raise HTTPException(status_code=400, detail="X-Business-ID header missing")
    return x_business_id


# Product Endpoints
@router.get("/", response_model=list[schemas.ProductResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    return service.get_products(db, business_id=business_id, skip=skip, limit=limit)


@router.post(
    "/", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED
)
def create_product(
    product: schemas.ProductCreate,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    return service.create_product(db, business_id=business_id, product=product)


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(
    product_id: str,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    return service.get_product(db, business_id=business_id, product_id=product_id)


# Category Endpoints
@router.get("/categories/", response_model=list[schemas.CategoryResponse])
def list_categories(
    skip: int = 0,
    limit: int = 100,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    return service.get_categories(db, business_id=business_id, skip=skip, limit=limit)


@router.post(
    "/categories/",
    response_model=schemas.CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category: schemas.CategoryCreate,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    return service.create_category(db, business_id=business_id, category=category)


# Inventory Tracking Endpoints
@router.post(
    "/variants/{variant_id}/stock", response_model=schemas.ProductVariantResponse
)
def adjust_stock(
    variant_id: str,
    adjust: schemas.InventoryAdjust,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    """Adjusts physical stock level for a variant (positive or negative)"""
    return service.update_inventory(
        db, business_id=business_id, variant_id=variant_id, adjust=adjust
    )


@router.post(
    "/variants/{variant_id}/reserve", response_model=schemas.ProductVariantResponse
)
def reserve_stock(
    variant_id: str,
    reserve: schemas.InventoryReservation,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    """Reserves stock temporarily for pending orders"""
    return service.reserve_inventory(
        db, business_id=business_id, variant_id=variant_id, reserve=reserve
    )


@router.post(
    "/variants/{variant_id}/confirm-reservation",
    response_model=schemas.ProductVariantResponse,
)
def confirm_stock_reservation(
    variant_id: str,
    quantity: int,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    """Confirms/consumes reserved stock when order is finalized"""
    return service.confirm_reservation(
        db, business_id=business_id, variant_id=variant_id, quantity=quantity
    )


@router.post(
    "/variants/{variant_id}/cancel-reservation",
    response_model=schemas.ProductVariantResponse,
)
def cancel_stock_reservation(
    variant_id: str,
    quantity: int,
    business_id: str = Depends(get_business_id),
    db: Session = Depends(get_db),
):
    """Cancels reserved stock if checkout fails or expires"""
    return service.cancel_reservation(
        db, business_id=business_id, variant_id=variant_id, quantity=quantity
    )
