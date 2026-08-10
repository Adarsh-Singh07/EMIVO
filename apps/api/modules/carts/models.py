import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, TenantMixin, TimestampMixin


class Cart(Base, TimestampMixin, TenantMixin):
    __tablename__ = "carts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), index=True, nullable=True
    )
    session_id: Mapped[Optional[str]] = mapped_column(
        String(255), index=True, nullable=True
    )

    # Store subtotal as minor units (e.g. cents / paise)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    items: Mapped[List["CartItem"]] = relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class CartItem(Base, TimestampMixin):
    __tablename__ = "cart_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    cart_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("carts.id"), nullable=False, index=True
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id"), nullable=False
    )
    variant_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("product_variants.id"), nullable=True
    )

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    cart: Mapped["Cart"] = relationship("Cart", back_populates="items")
