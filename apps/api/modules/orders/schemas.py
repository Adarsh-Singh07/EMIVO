from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from modules.orders.models import OrderStatus


class Address(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    street: str = Field(..., min_length=5, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    postal_code: str = Field(..., min_length=3, max_length=20)
    country: str = Field(..., min_length=2, max_length=2)
    phone: str | None = Field(None, max_length=20)


class OrderItemCreate(BaseModel):
    product_id: str = Field(..., min_length=36, max_length=36)
    variant_id: str | None = Field(None, min_length=36, max_length=36)
    quantity: int = Field(..., gt=0)
    # The client shouldn't send prices; the server calculates them from product data,
    # but for this MVP API contract we might accept them or calculate them.
    # Assuming server calculates.


class OrderCreate(BaseModel):
    idempotency_key: str = Field(..., min_length=5, max_length=255)
    shipping_address: Address
    billing_address: Address | None = None
    items: list[OrderItemCreate] = Field(..., min_length=1)
    metadata_info: dict[str, Any] | None = None


class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    variant_id: str | None
    quantity: int
    unit_price: int
    subtotal: int
    tax: int
    total: int
    product_name: str
    variant_name: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: str
    user_id: str
    business_id: str
    status: OrderStatus
    idempotency_key: str
    subtotal: int
    tax_total: int
    shipping_total: int
    discount_total: int
    total: int
    currency: str
    shipping_address: dict
    billing_address: dict | None
    metadata_info: dict | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    reason: str | None = None
