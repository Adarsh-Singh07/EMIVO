from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Coupon, CouponUsage
from .schemas import CouponCreate


class CouponRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, coupon_id: str, tenant_id: str) -> Coupon | None:
        stmt = select(Coupon).where(
            Coupon.id == coupon_id,
            Coupon.tenant_id == tenant_id,
            Coupon.is_deleted == False,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_code(self, code: str, tenant_id: str) -> Coupon | None:
        stmt = select(Coupon).where(
            func.lower(Coupon.code) == code.lower(),
            Coupon.tenant_id == tenant_id,
            Coupon.is_deleted == False,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_all(self, tenant_id: str, skip: int = 0, limit: int = 100) -> list[Coupon]:
        stmt = (
            select(Coupon)
            .where(Coupon.tenant_id == tenant_id, Coupon.is_deleted == False)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def create(self, coupon: CouponCreate, tenant_id: str) -> Coupon:
        db_coupon = Coupon(tenant_id=tenant_id, **coupon.model_dump())
        self.db.add(db_coupon)
        self.db.commit()
        self.db.refresh(db_coupon)
        return db_coupon

    def update(self, db_coupon: Coupon, update_data: dict) -> Coupon:
        for key, value in update_data.items():
            setattr(db_coupon, key, value)

        self.db.commit()
        self.db.refresh(db_coupon)
        return db_coupon

    def delete(self, db_coupon: Coupon):
        db_coupon.is_deleted = True
        db_coupon.deleted_at = func.now()
        self.db.commit()

    def get_user_usage_count(self, coupon_id: str, user_id: str, tenant_id: str) -> int:
        stmt = select(func.count(CouponUsage.id)).where(
            CouponUsage.coupon_id == coupon_id,
            CouponUsage.user_id == user_id,
            CouponUsage.tenant_id == tenant_id,
        )
        return self.db.execute(stmt).scalar() or 0

    def record_usage(
        self,
        coupon_id: str,
        user_id: str,
        order_id: str | None,
        discount_applied: int,
        tenant_id: str,
    ) -> CouponUsage:
        usage = CouponUsage(
            coupon_id=coupon_id,
            user_id=user_id,
            order_id=order_id,
            discount_applied=discount_applied,
            tenant_id=tenant_id,
        )
        self.db.add(usage)

        # Increment coupon usage count
        stmt = select(Coupon).where(Coupon.id == coupon_id)
        coupon = self.db.execute(stmt).scalar_one()
        coupon.usage_count += 1

        self.db.commit()
        self.db.refresh(usage)
        return usage
