from typing import Any

from pydantic import BaseModel, Field


class SearchQuery(BaseModel):
    query: str
    limit: int = Field(default=10, ge=1, le=100)
    filters: dict[str, Any] | None = None
    model_version: str = "v1"


class SearchResponseItem(BaseModel):
    product_id: str
    score: float
    metadata: dict[str, Any] | None = None


class SearchResponse(BaseModel):
    results: list[SearchResponseItem]
    count: int


class IndexProductRequest(BaseModel):
    product_id: str
    text_content: str
    metadata: dict[str, Any] | None = None
    model_version: str = "v1"
