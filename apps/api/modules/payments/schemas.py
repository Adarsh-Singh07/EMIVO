from datetime import datetime
from typing import Any

from pydantic import UUID4, BaseModel, Field

from .models import PaymentProvider, PaymentStatus


class PaymentCreate(BaseModel):
    order_id: UUID4
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    provider: PaymentProvider
    idempotency_key: str
    metadata: dict[str, Any] | None = None


class PaymentResponse(BaseModel):
    id: UUID4
    order_id: UUID4
    amount: float
    currency: str
    status: PaymentStatus
    provider: PaymentProvider
    provider_payment_id: str | None
    provider_order_id: str | None
    created_at: datetime

    class Config:
        orm_mode = True


class WebhookPayload(BaseModel):
    event: str
    payload: dict[str, Any]
