from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from modules.returns.models import ReturnReason, ReturnStatus


class ReturnRequestCreate(BaseModel):
    order_item_id: str = Field(..., min_length=1, max_length=36)
    qty: int = Field(1, ge=1, le=100)
    reason: ReturnReason
    customer_note: Optional[str] = Field(None, max_length=1000)


class AdminReturnRequestCreate(ReturnRequestCreate):
    order_id: str = Field(..., min_length=1, max_length=36)
    refund_amount: Optional[int] = Field(None, ge=0)
    bypass_window: bool = False


class ReturnApproveRequest(BaseModel):
    refund_amount: Optional[int] = Field(None, ge=0)
    resolution_note: Optional[str] = Field(None, max_length=1000)


class ReturnRejectRequest(BaseModel):
    resolution_note: str = Field(..., min_length=3, max_length=1000)


class ReturnSchedulePickupRequest(BaseModel):
    pickup_tracking: Optional[str] = Field(None, max_length=120)
    resolution_note: Optional[str] = Field(None, max_length=1000)


class ReturnMarkReceivedRequest(BaseModel):
    refund_amount: Optional[int] = Field(None, ge=0)
    resolution_note: Optional[str] = Field(None, max_length=1000)
    issue_refund: bool = True


class ReturnRefundRequest(BaseModel):
    refund_amount: Optional[int] = Field(None, ge=0)
    resolution_note: Optional[str] = Field(None, max_length=1000)


class ReturnCloseRequest(BaseModel):
    resolution_note: Optional[str] = Field(None, max_length=1000)


class ReturnRequestResponse(BaseModel):
    id: str
    return_number: Optional[str] = None
    order_id: str
    order_number: Optional[str] = None
    order_item_id: str
    user_id: str
    business_id: str
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    variant_name: Optional[str] = None
    unit_price: Optional[int] = None
    purchased_qty: Optional[int] = None
    qty: int
    reason: str
    customer_note: Optional[str] = None
    status: str
    refund_amount: int
    payment_id: Optional[str] = None
    payment_method: Optional[str] = None
    resolution_note: Optional[str] = None
    pickup_tracking: Optional[str] = None
    reviewed_by: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_city: Optional[str] = None
    customer_pincode: Optional[str] = None
    delivered_at: Optional[datetime] = None
    requested_at: datetime
    approved_at: Optional[datetime] = None
    pickup_scheduled_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedReturnRequestsResponse(BaseModel):
    items: List[ReturnRequestResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool
