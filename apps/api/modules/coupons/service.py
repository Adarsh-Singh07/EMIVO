from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.coupons.models import Coupon, DiscountType
from modules.coupons.repository import CouponRepository
from modules.coupons.schemas import (
    CouponCreate,
    CouponUpdate,
    CouponResponse,
    PaginatedCouponsResponse,
    CouponValidateRequest,
    CouponValidateResponse,
    CouponApplyRequest,
)


class CouponService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = CouponRepository(db)

    async def _get_current_business_id(self) -> str:
        res = await self.db.execute(
            text("SELECT NULLIF(current_setting('app.business_id', true), '')")
        )
        current_b_id = res.scalar()
        if not current_b_id:
            raise DomainException(
                "Tenant context missing or invalid",
                code="UNAUTHORIZED",
                status_code=401
            )
        return str(current_b_id)

    async def create_coupon(self, coupon_data: CouponCreate) -> Coupon:
        business_id = await self._get_current_business_id()

        existing = await self.repository.get_by_code(coupon_data.code)
        if existing:
            raise DomainException(
                f"Coupon with code '{coupon_data.code.upper()}' already exists in this business",
                code="DUPLICATE_RESOURCE",
                status_code=409
            )

        coupon = await self.repository.create(coupon_data, business_id)
        await self.db.commit()
        return await self.repository.get_by_id(coupon.id)

    async def get_coupon(self, coupon_id: str) -> Coupon:
        coupon = await self.repository.get_by_id(coupon_id)
        if not coupon:
            raise DomainException("Coupon not found", code="NOT_FOUND", status_code=404)
        return coupon

    async def list_coupons(
        self, page: int = 1, page_size: int = 20
    ) -> PaginatedCouponsResponse:
        items, total = await self.repository.list_coupons(page=page, page_size=page_size)
        has_next = (page * page_size) < total
        has_prev = page > 1

        return PaginatedCouponsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_prev=has_prev
        )

    async def update_coupon(self, coupon_id: str, update_data: CouponUpdate) -> Coupon:
        coupon = await self.get_coupon(coupon_id)
        updated = await self.repository.update(coupon, update_data)
        await self.db.commit()
        return await self.repository.get_by_id(updated.id)

    async def delete_coupon(self, coupon_id: str) -> None:
        coupon = await self.get_coupon(coupon_id)
        await self.repository.soft_delete(coupon)
        await self.db.commit()

    async def validate_coupon(
        self, req: CouponValidateRequest
    ) -> CouponValidateResponse:
        coupon = await self.repository.get_by_code(req.code)

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
            user_count = await self.repository.get_user_usage_count(
                coupon.id, req.user_id
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

        coupon_resp = CouponResponse.model_validate(coupon)

        return CouponValidateResponse(
            is_valid=True,
            coupon=coupon_resp,
            discount_amount=discount,
            message="Coupon applied successfully",
        )

    async def apply_coupon(
        self, req: CouponApplyRequest
    ) -> Tuple[CouponResponse, int]:
        business_id = await self._get_current_business_id()
        val_req = CouponValidateRequest(
            code=req.code, cart_subtotal=req.cart_subtotal, user_id=req.user_id
        )
        res = await self.validate_coupon(val_req)

        if not res.is_valid or not res.coupon:
            raise DomainException(res.message, code="BAD_REQUEST", status_code=400)

        await self.repository.record_usage(
            coupon_id=res.coupon.id,
            user_id=req.user_id,
            business_id=business_id,
            order_id=req.order_id,
            discount_applied=res.discount_amount,
        )

        await self.db.commit()
        coupon = await self.repository.get_by_id(res.coupon.id)
        return CouponResponse.model_validate(coupon), res.discount_amount
