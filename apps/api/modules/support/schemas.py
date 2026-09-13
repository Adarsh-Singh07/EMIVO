from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    category: str = Field(..., pattern="^(order|payment|product|delivery|other)$")
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5, max_length=5000)
    order_id: Optional[str] = None


class TicketMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=3000)


class TicketMessageOut(BaseModel):
    id: str
    sender: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketOut(BaseModel):
    id: str
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    category: str
    subject: str
    status: str
    created_at: datetime
    updated_at: datetime
    messages: List[TicketMessageOut] = []

    class Config:
        from_attributes = True


class TicketStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|resolved)$")
