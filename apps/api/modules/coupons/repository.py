from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.coupons.models import Coupon, CouponUsage
from modules.coupons.schemas import CouponCreate, CouponUpdate


class CouponRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, coupon_id: str) -> Optional[Coupon]:
        stmt = (
            select(Coupon)
            .options(selectinload(Coupon.usages))
            .execution_options(populate_existing=True)
            .where(
                Coupon.id == coupon_id,
                Coupon.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Optional[Coupon]:
        stmt = (
            select(Coupon)
            .options(selectinload(Coupon.usages))
            .execution_options(populate_existing=True)
            .where(
                func.lower(Coupon.code) == code.lower(),
                Coupon.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_coupons(
        self, page: int = 1, page_size: int = 20
    ) -> Tuple[List[Coupon], int]:
        stmt = select(Coupon).where(Coupon.deleted_at.is_(None))

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Pagination
        paginated_stmt = (
            stmt.order_by(Coupon.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(selectinload(Coupon.usages))
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(paginated_stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(self, coupon_data: CouponCreate, business_id: str) -> Coupon:
        db_coupon = Coupon(
            business_id=business_id,
            code=coupon_data.code.upper(),
            description=coupon_data.description,
            discount_type=coupon_data.discount_type,
            discount_value=coupon_data.discount_value,
            min_order_amount=coupon_data.min_order_amount,
            max_discount_amount=coupon_data.max_discount_amount,
            usage_limit=coupon_data.usage_limit,
            per_user_limit=coupon_data.per_user_limit,
            start_date=coupon_data.start_date,
            end_date=coupon_data.end_date,
            is_active=coupon_data.is_active,
            terms_conditions=coupon_data.terms_conditions,
            usage_count=0,
        )
        self.db.add(db_coupon)
        await self.db.flush()
        return db_coupon

    async def update(self, coupon: Coupon, update_data: CouponUpdate) -> Coupon:
        update_dict = update_data.model_dump(exclude_unset=True)
        if 'terms_conditions' in update_dict and update_dict['terms_conditions'] is None:
            # allow clearing it out but usually we want to respect the value given
            pass
        for key, value in update_dict.items():
            setattr(coupon, key, value)
        await self.db.flush()
        return coupon

    async def soft_delete(self, coupon: Coupon) -> None:
        coupon.deleted_at = datetime.now(timezone.utc)
        coupon.is_active = False
        await self.db.flush()

    async def get_user_usage_count(self, coupon_id: str, user_id: str) -> int:
        stmt = select(func.count(CouponUsage.id)).where(
            CouponUsage.coupon_id == coupon_id,
            CouponUsage.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def record_usage(
        self,
        coupon_id: str,
        user_id: str,
        business_id: str,
        discount_applied: int,
        order_id: Optional[str] = None,
    ) -> CouponUsage:
        usage = CouponUsage(
            coupon_id=coupon_id,
            user_id=user_id,
            business_id=business_id,
            order_id=order_id,
            discount_applied=discount_applied,
        )
        self.db.add(usage)

        # Increment coupon usage count
        stmt = select(Coupon).where(Coupon.id == coupon_id)
        result = await self.db.execute(stmt)
        coupon = result.scalar_one_or_none()
        if coupon:
            coupon.usage_count += 1
            await self.db.flush()

        return usage
