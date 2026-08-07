from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class ProductViewEvent(BaseModel):
    product_id: str
    user_id: str | None = None
    session_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrderFunnelsEvent(BaseModel):
    order_id: str | None = None
    cart_id: str
    user_id: str | None = None
    session_id: str
    step: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchTermEvent(BaseModel):
    term: str
    user_id: str | None = None
    session_id: str
    results_count: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)
