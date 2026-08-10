import enum
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from core.models import SoftDeleteMixin, TenantMixin, TimestampMixin


class DiscountType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED_AMOUNT = "FIXED_AMOUNT"


class Coupon(Base, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "coupons"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType), nullable=False
    )
    # Stored as minor integer units for FIXED_AMOUNT, or percentage integer e.g., 15 for 15%
    discount_value: Mapped[int] = mapped_column(Integer, nullable=False)

    min_order_amount: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=0
    )
    max_discount_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    usage_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    per_user_limit: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=1
    )

    start_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    usages: Mapped[List["CouponUsage"]] = relationship(
        "CouponUsage", back_populates="coupon", cascade="all, delete-orphan", lazy="selectin"
    )


class CouponUsage(Base, TimestampMixin, TenantMixin):
    __tablename__ = "coupon_usages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    coupon_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("coupons.id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    order_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("orders.id"), nullable=True
    )

    discount_applied: Mapped[int] = mapped_column(Integer, nullable=False)

    coupon: Mapped["Coupon"] = relationship("Coupon", back_populates="usages")
