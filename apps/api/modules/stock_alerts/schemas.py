from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class StockAlertCreateRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="10-digit mobile or with country code")
    email: Optional[str] = Field(None, max_length=255)
    channel: str = Field("whatsapp", pattern="^(whatsapp|email|both)$")


class StockAlertResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    product_slug: Optional[str] = None
    phone: str
    email: Optional[str] = None
    channel: str
    notified_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
