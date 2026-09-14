from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=120)
    body: Optional[str] = Field(None, max_length=4000)


class ReviewOut(BaseModel):
    id: str
    rating: int
    title: Optional[str] = None
    body: Optional[str] = None
    verified_purchase: bool = False
    author_name: Optional[str] = None
    created_at: datetime


class ReviewSummary(BaseModel):
    average: Optional[float] = None
    count: int = 0


class ReviewsResponse(BaseModel):
    summary: ReviewSummary
    items: List[ReviewOut]
    mine: Optional[ReviewOut] = None
