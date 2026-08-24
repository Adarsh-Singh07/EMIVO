import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, TimestampMixin


class InventoryReason(str, enum.Enum):
    RESTOCK = "RESTOCK"        # stock added by admin
    SALE = "SALE"              # reserved stock committed to a paid/confirmed order
    RESERVE = "RESERVE"        # stock reserved at order creation
    RELEASE = "RELEASE"        # reservation released (cancel/failure/expiry)
    ADJUST = "ADJUST"          # manual correction
    COUNT = "COUNT"            # physical stock-take set
    RETURN = "RETURN"          # customer return back to stock
    DAMAGE = "DAMAGE"          # written off


class Inventory(Base, TimestampMixin):
    """Stock level for a product. available = on_hand - reserved (enforced atomically in SQL).

    Variants share their product's pool in v0.2 (single-stock-per-product model).
    """

    __tablename__ = "inventory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    variant_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, unique=True
    )
    business_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    on_hand: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    reserved: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=5, server_default="5")

    __table_args__ = (
        CheckConstraint("on_hand >= 0", name="ck_inventory_on_hand_nonnegative"),
        CheckConstraint("reserved >= 0", name="ck_inventory_reserved_nonnegative"),
        CheckConstraint("reserved <= on_hand", name="ck_inventory_reserved_within_on_hand"),
        Index("ix_inventory_business", "business_id"),
        dict(comment="Product stock levels; available = on_hand - reserved"),
    )

    product = relationship("Product", back_populates="inventory")

    @property
    def available(self) -> int:
        return self.on_hand - self.reserved


class InventoryMovement(Base, TimestampMixin):
    """Audit trail for every inventory change."""

    __tablename__ = "inventory_movements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    order_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    delta_on_hand: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    delta_reserved: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    on_hand_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[InventoryReason] = mapped_column(
        Enum(InventoryReason, name="inventoryreason", native_enum=True), nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
