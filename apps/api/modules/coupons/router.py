from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from core.database import get_db

from .schemas import (
    Coupon,
    CouponCreate,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)
from .service import CouponService

router = APIRouter(prefix="/coupons", tags=["coupons"])


@router.post("", response_model=Coupon, status_code=status.HTTP_201_CREATED)
def create_coupon(
    coupon_data: CouponCreate,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Create a new coupon (Admin)
    """
    service = CouponService(db)
    return service.create_coupon(coupon_data, x_tenant_id)


@router.get("", response_model=list[Coupon])
def list_coupons(
    skip: int = 0,
    limit: int = 100,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    List coupons for tenant
    """
    service = CouponService(db)
    return service.list_coupons(x_tenant_id, skip=skip, limit=limit)


@router.post("/validate", response_model=CouponValidateResponse)
def validate_coupon(
    req: CouponValidateRequest,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Validate a coupon code and calculate discount
    """
    service = CouponService(db)
    return service.validate_coupon(req, x_tenant_id)


@router.get("/{coupon_id}", response_model=Coupon)
def get_coupon(
    coupon_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Get coupon details
    """
    service = CouponService(db)
    return service.get_coupon(coupon_id, x_tenant_id)


@router.patch("/{coupon_id}", response_model=Coupon)
def update_coupon(
    coupon_id: str,
    update_data: CouponUpdate,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Update a coupon
    """
    service = CouponService(db)
    return service.update_coupon(coupon_id, update_data, x_tenant_id)


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(
    coupon_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Delete (soft-delete) a coupon
    """
    service = CouponService(db)
    service.delete_coupon(coupon_id, x_tenant_id)
