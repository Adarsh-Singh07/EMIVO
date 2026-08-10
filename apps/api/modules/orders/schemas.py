from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field

from modules.orders.models import OrderStatus


class Address(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    street: str = Field(..., min_length=5, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    postal_code: str = Field(..., min_length=3, max_length=20)
    country: str = Field(..., min_length=2, max_length=2)
    phone: Optional[str] = Field(None, max_length=20)


class OrderItemCreate(BaseModel):
    product_id: str = Field(..., min_length=36, max_length=36)
    variant_id: Optional[str] = Field(None, min_length=36, max_length=36)
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: Optional[str] = Field(None, min_length=36, max_length=36)
    idempotency_key: Optional[str] = Field(None, max_length=255)
    shipping_address: Optional[Address] = None
    billing_address: Optional[Address] = None
    items: List[OrderItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = Field(None, max_length=1000)
    metadata_info: Optional[dict[str, Any]] = None


class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str] = None
    quantity: int
    unit_price: int
    subtotal: int
    tax: int
    total: int
    product_name: str
    variant_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: str
    user_id: str
    customer_id: Optional[str] = None
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
    billing_address: Optional[dict] = None
    notes: Optional[str] = None
    metadata_info: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    reason: Optional[str] = Field(None, max_length=500)


class PaginatedOrdersResponse(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool
