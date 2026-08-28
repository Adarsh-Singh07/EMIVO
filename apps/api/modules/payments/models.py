import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from core.database import Base
from core.models import TenantMixin


class PaymentStatus(str, enum.Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    REFUNDED = "REFUNDED"


class PaymentProvider(str, enum.Enum):
    CASHFREE = "CASHFREE"
    EASEBUZZ = "EASEBUZZ"
    STRIPE = "STRIPE"
    MOCK = "MOCK"


class Payment(Base, TenantMixin):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    amount = Column(Integer, nullable=False)  # Minor units (e.g. cents/paise)
    currency = Column(String(3), nullable=False, default="INR")

    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.CREATED)
    provider = Column(Enum(PaymentProvider), nullable=False, default=PaymentProvider.MOCK)

    provider_payment_id = Column(String(255), nullable=True, unique=True)
    provider_order_id = Column(String(255), nullable=True)

    idempotency_key = Column(String(255), nullable=True, unique=True, index=True)

    metadata_info = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    events = relationship("PaymentEvent", back_populates="payment", cascade="all, delete-orphan", lazy="selectin")


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=False)

    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    payment = relationship("Payment", back_populates="events")
