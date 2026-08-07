from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import Coupon, DiscountType
from .repository import CouponRepository
from .schemas import (
    CouponCreate,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)


class CouponService:
    def __init__(self, db: Session):
        self.repository = CouponRepository(db)

    def create_coupon(self, coupon_data: CouponCreate, tenant_id: str) -> Coupon:
        existing = self.repository.get_by_code(coupon_data.code, tenant_id)
        if existing:
            raise HTTPException(
                status_code=400, detail="Coupon code already exists for this tenant"
            )

        return self.repository.create(coupon_data, tenant_id)

    def get_coupon(self, coupon_id: str, tenant_id: str) -> Coupon:
        coupon = self.repository.get_by_id(coupon_id, tenant_id)
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return coupon

    def list_coupons(
        self, tenant_id: str, skip: int = 0, limit: int = 100
    ) -> list[Coupon]:
        return self.repository.get_all(tenant_id, skip=skip, limit=limit)

    def update_coupon(
        self, coupon_id: str, update_data: CouponUpdate, tenant_id: str
    ) -> Coupon:
        coupon = self.get_coupon(coupon_id, tenant_id)
        updates = update_data.model_dump(exclude_unset=True)
        return self.repository.update(coupon, updates)

    def delete_coupon(self, coupon_id: str, tenant_id: str):
        coupon = self.get_coupon(coupon_id, tenant_id)
        self.repository.delete(coupon)

    def validate_coupon(
        self, req: CouponValidateRequest, tenant_id: str
    ) -> CouponValidateResponse:
        coupon = self.repository.get_by_code(req.code, tenant_id)

        if not coupon:
            return CouponValidateResponse(is_valid=False, message="Invalid coupon code")

        if not coupon.is_active:
            return CouponValidateResponse(is_valid=False, message="Coupon is inactive")

        now = datetime.now(timezone.utc)
        if coupon.start_date and coupon.start_date > now:
            return CouponValidateResponse(
                is_valid=False, message="Coupon is not active yet"
            )

        if coupon.end_date and coupon.end_date < now:
            return CouponValidateResponse(is_valid=False, message="Coupon has expired")

        if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
            return CouponValidateResponse(
                is_valid=False, message="Coupon global usage limit reached"
            )

        if req.user_id and coupon.per_user_limit:
            user_count = self.repository.get_user_usage_count(
                coupon.id, req.user_id, tenant_id
            )
            if user_count >= coupon.per_user_limit:
                return CouponValidateResponse(
                    is_valid=False, message="Per-user coupon usage limit reached"
                )

        if coupon.min_order_amount and req.cart_subtotal < coupon.min_order_amount:
            return CouponValidateResponse(
                is_valid=False,
                message=f"Minimum order subtotal for this coupon is {coupon.min_order_amount}",
            )

        # Calculate discount
        discount = 0
        if coupon.discount_type == DiscountType.FIXED_AMOUNT:
            discount = coupon.discount_value
        elif coupon.discount_type == DiscountType.PERCENTAGE:
            # discount_value stored as percentage e.g. 15 for 15%
            discount = int((req.cart_subtotal * coupon.discount_value) / 100)

        if coupon.max_discount_amount and discount > coupon.max_discount_amount:
            discount = coupon.max_discount_amount

        # Cannot exceed subtotal
        discount = min(discount, req.cart_subtotal)

        return CouponValidateResponse(
            is_valid=True,
            coupon=coupon,
            discount_amount=discount,
            message="Coupon applied successfully",
        )

    def apply_coupon(
        self,
        code: str,
        user_id: str,
        order_id: str | None,
        cart_subtotal: int,
        tenant_id: str,
    ) -> tuple[Coupon, int]:
        req = CouponValidateRequest(
            code=code, cart_subtotal=cart_subtotal, user_id=user_id
        )
        res = self.validate_coupon(req, tenant_id)

        if not res.is_valid or not res.coupon:
            raise HTTPException(status_code=400, detail=res.message)

        self.repository.record_usage(
            coupon_id=res.coupon.id,
            user_id=user_id,
            order_id=order_id,
            discount_applied=res.discount_amount,
            tenant_id=tenant_id,
        )

        return res.coupon, res.discount_amount
