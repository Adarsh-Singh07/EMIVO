from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from modules.inventory.models import InventoryReason


class InventoryResponse(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    business_id: str
    on_hand: int
    reserved: int
    available: int
    low_stock_threshold: int
    is_low_stock: bool
    is_out_of_stock: bool
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InventoryListResponse(BaseModel):
    items: List[InventoryResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class InventoryAdjustRequest(BaseModel):
    """Admin stock operation. Exactly one mode per call."""
    mode: str = Field(..., pattern="^(set|delta|restock|damage|return)$")
    value: int = Field(..., ge=0, description="set: absolute on_hand; others: magnitude of change")
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)
    note: Optional[str] = Field(default=None, max_length=500)


class InventoryMovementResponse(BaseModel):
    id: str
    product_id: str
    order_id: Optional[str] = None
    delta_on_hand: int
    delta_reserved: int
    on_hand_after: int
    reserved_after: int
    reason: InventoryReason
    note: Optional[str] = None
    actor_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryMovementsResponse(BaseModel):
    items: List[InventoryMovementResponse]
    total: int
