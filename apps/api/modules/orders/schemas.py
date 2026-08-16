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
    tracking_number: Optional[str] = Field(None, max_length=120)
    tracking_url: Optional[str] = Field(None, max_length=500)


class PaginatedOrdersResponse(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


# --------------------------------------------------------------------------
# Checkout (v0.2)
# --------------------------------------------------------------------------

class CheckoutAddress(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., pattern=r"^[0-9]{10}$", description="10-digit Indian mobile")
    line1: str = Field(..., min_length=5, max_length=255)
    line2: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., min_length=2, max_length=120)
    state: str = Field(..., min_length=2, max_length=120)
    pincode: str = Field(..., pattern=r"^[1-9][0-9]{5}$", description="6-digit Indian PIN")
    country: str = Field("IN", min_length=2, max_length=2)


class CheckoutItem(BaseModel):
    product_id: str = Field(..., min_length=36, max_length=36)
    variant_id: Optional[str] = Field(None, min_length=36, max_length=36)
    quantity: int = Field(..., gt=0, le=99)


class CheckoutRequest(BaseModel):
    """Server-authoritative checkout: the backend resolves items from the
    user's cart (or explicit items), recomputes every price, applies the
    coupon atomically, reserves stock, and creates the order."""
    items: Optional[List[CheckoutItem]] = Field(
        default=None,
        description="Explicit items; when omitted the user's active server cart is used",
    )
    address_id: Optional[str] = Field(None, min_length=36, max_length=36)
    shipping_address: Optional[CheckoutAddress] = None
    coupon_code: Optional[str] = Field(None, max_length=50)
    payment_method: str = Field(..., pattern="^(COD|ONLINE)$")
    notes: Optional[str] = Field(None, max_length=1000)
    idempotency_key: Optional[str] = Field(None, max_length=255)


class OrderResponseV2(OrderResponse):
    order_number: Optional[str] = None
    payment_method: Optional[str] = None
    coupon_code: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    payment_status: Optional[str] = None


class CheckoutResponse(BaseModel):
    order: OrderResponseV2
    payment_required: bool
    payment_id: Optional[str] = None


class PaginatedOrdersResponseV2(BaseModel):
    items: List[OrderResponseV2]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool
