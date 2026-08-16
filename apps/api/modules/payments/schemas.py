from datetime import datetime
from typing import Any, Optional, List
from pydantic import BaseModel, Field

from .models import PaymentProvider, PaymentStatus


class PaymentCreate(BaseModel):
    order_id: str
    amount: Optional[int] = Field(
        default=None, gt=0,
        description="Optional client-side amount for integrity check; the server always uses the order total.",
    )
    currency: str = Field("INR", max_length=3)
    provider: PaymentProvider = PaymentProvider.MOCK
    idempotency_key: str
    metadata: Optional[dict[str, Any]] = None


class PaymentEventResponse(BaseModel):
    id: str
    payment_id: str
    event_type: str
    payload: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    id: str
    business_id: str
    order_id: str
    user_id: str
    amount: int
    currency: str
    status: PaymentStatus
    provider: PaymentProvider
    provider_payment_id: Optional[str] = None
    provider_order_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    metadata_info: Optional[dict[str, Any]] = None
    events: List[PaymentEventResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedPaymentsResponse(BaseModel):
    items: List[PaymentResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class PaymentSuccessVerification(BaseModel):
    provider_payment_id: str
    provider_signature: str


class PaymentRefundRequest(BaseModel):
    amount: Optional[int] = Field(None, gt=0, description="Optional partial refund amount in minor units. If omitted, full refund is issued.")
    reason: Optional[str] = None


class PaymentInitiationResponse(BaseModel):
    """Everything the storefront needs to open the provider checkout widget."""
    payment: PaymentResponse
    provider: str
    checkout: dict[str, Any] = Field(
        default_factory=dict,
        description="Provider checkout parameters (e.g. Razorpay key_id, order_id, amount)",
    )
