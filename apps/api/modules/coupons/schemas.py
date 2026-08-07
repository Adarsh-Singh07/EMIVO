from datetime import datetime

from pydantic import BaseModel, Field

from .models import DiscountType


class CouponBase(BaseModel):
    code: str = Field(..., max_length=50)
    description: str | None = None
    discount_type: DiscountType
    discount_value: int = Field(..., gt=0)
    min_order_amount: int | None = Field(default=0, ge=0)
    max_discount_amount: int | None = Field(default=None, ge=0)
    usage_limit: int | None = Field(default=None, gt=0)
    per_user_limit: int | None = Field(default=1, gt=0)
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    description: str | None = None
    min_order_amount: int | None = Field(default=None, ge=0)
    max_discount_amount: int | None = Field(default=None, ge=0)
    usage_limit: int | None = Field(default=None, gt=0)
    per_user_limit: int | None = Field(default=None, gt=0)
    end_date: datetime | None = None
    is_active: bool | None = None


class Coupon(CouponBase):
    id: str
    tenant_id: str
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CouponValidateRequest(BaseModel):
    code: str
    cart_subtotal: int = Field(..., ge=0)
    user_id: str | None = None


class CouponValidateResponse(BaseModel):
    is_valid: bool
    coupon: Coupon | None = None
    discount_amount: int = 0
    message: str
