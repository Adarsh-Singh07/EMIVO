"""Return requests — customer-initiated 7-day post-delivery returns & refunds."""
import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from core.models import Base, TenantMixin, TimestampMixin


class ReturnReason(str, enum.Enum):
    DAMAGED = "DAMAGED"
    DEFECTIVE = "DEFECTIVE"
    WRONG_ITEM = "WRONG_ITEM"
    NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED"


class ReturnStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    RETURNED = "RETURNED"
    REFUNDED = "REFUNDED"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


class ReturnRequest(Base, TimestampMixin, TenantMixin):
    __tablename__ = "return_requests"
    __table_args__ = (
        CheckConstraint("qty > 0", name="ck_return_requests_qty_positive"),
        CheckConstraint(
            "reason IN ('DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED')",
            name="ck_return_requests_reason",
        ),
        CheckConstraint(
            "status IN ('REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'RETURNED', 'REFUNDED', 'REJECTED', 'CLOSED')",
            name="ck_return_requests_status",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    return_number: Mapped[Optional[str]] = mapped_column(
        String(30), unique=True, index=True, nullable=True
    )
    order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    seller_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sellers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(30), nullable=False)
    customer_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ReturnStatus.REQUESTED.value, server_default="REQUESTED", index=True
    )
    refund_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    payment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True
    )
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pickup_tracking: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    returned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    refunded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
