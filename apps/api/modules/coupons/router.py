from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.dependencies import set_db_context, require_roles
from modules.coupons.schemas import (
    CouponCreate,
    CouponUpdate,
    CouponResponse,
    PaginatedCouponsResponse,
    CouponValidateRequest,
    CouponValidateResponse,
    CouponApplyRequest,
)
from modules.coupons.service import CouponService

router = APIRouter(prefix="/coupons", tags=["coupons"])


async def get_coupon_service(
    db: AsyncSession = Depends(set_db_context)
) -> CouponService:
    return CouponService(db)


@router.post(
    "/",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def create_coupon(
    coupon_in: CouponCreate,
    service: CouponService = Depends(get_coupon_service),
):
    """
    Create a new coupon.
    """
    return await service.create_coupon(coupon_in)


@router.get(
    "/",
    response_model=PaginatedCouponsResponse,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def list_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: CouponService = Depends(get_coupon_service),
):
    """
    List coupons with pagination.
    """
    return await service.list_coupons(page=page, page_size=page_size)


@router.get(
    "/{coupon_id}",
    response_model=CouponResponse,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def get_coupon(
    coupon_id: str,
    service: CouponService = Depends(get_coupon_service),
):
    """
    Get coupon details by ID.
    """
    return await service.get_coupon(coupon_id=coupon_id)


@router.patch(
    "/{coupon_id}",
    response_model=CouponResponse,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def update_coupon(
    coupon_id: str,
    update_data: CouponUpdate,
    service: CouponService = Depends(get_coupon_service),
):
    """
    Update coupon fields.
    """
    return await service.update_coupon(coupon_id=coupon_id, update_data=update_data)


@router.delete(
    "/{coupon_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(["owner", "platform_admin"]))]
)
async def delete_coupon(
    coupon_id: str,
    service: CouponService = Depends(get_coupon_service),
):
    """
    Soft-delete a coupon.
    """
    await service.delete_coupon(coupon_id=coupon_id)


@router.post(
    "/validate",
    response_model=CouponValidateResponse,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def validate_coupon(
    req: CouponValidateRequest,
    service: CouponService = Depends(get_coupon_service),
):
    """
    Validate a coupon code against a cart subtotal and user.
    """
    return await service.validate_coupon(req)


@router.post(
    "/apply",
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def apply_coupon(
    req: CouponApplyRequest,
    service: CouponService = Depends(get_coupon_service),
):
    """
    Apply coupon and record usage.
    """
    coupon, discount_amount = await service.apply_coupon(req)
    return {
        "coupon": coupon,
        "discount_amount": discount_amount,
        "message": "Coupon applied and usage recorded successfully"
    }
