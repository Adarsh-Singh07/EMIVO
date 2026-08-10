from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from .models import DiscountType


class CouponBase(BaseModel):
    code: str = Field(..., max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    discount_type: DiscountType
    discount_value: int = Field(..., gt=0, description="Minor units for FIXED_AMOUNT or integer percentage for PERCENTAGE")
    min_order_amount: Optional[int] = Field(default=0, ge=0)
    max_discount_amount: Optional[int] = Field(default=None, ge=0)
    usage_limit: Optional[int] = Field(default=None, gt=0)
    per_user_limit: Optional[int] = Field(default=1, gt=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=255)
    discount_value: Optional[int] = Field(None, gt=0)
    min_order_amount: Optional[int] = Field(default=None, ge=0)
    max_discount_amount: Optional[int] = Field(default=None, ge=0)
    usage_limit: Optional[int] = Field(default=None, gt=0)
    per_user_limit: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class CouponResponse(CouponBase):
    id: str
    business_id: str
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedCouponsResponse(BaseModel):
    items: List[CouponResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class CouponValidateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    cart_subtotal: int = Field(..., ge=0, description="Subtotal in minor units")
    user_id: Optional[str] = None


class CouponValidateResponse(BaseModel):
    is_valid: bool
    coupon: Optional[CouponResponse] = None
    discount_amount: int = 0
    message: str


class CouponApplyRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    cart_subtotal: int = Field(..., ge=0)
    user_id: str
    order_id: Optional[str] = None
