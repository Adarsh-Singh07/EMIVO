from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import datetime


class CatalogueCreate(BaseModel):
    title: str
    eyebrow: Optional[str] = "FEATURED"
    subtitle: Optional[str] = None
    category_link: Optional[str] = None
    position: int = 0
    is_active: bool = True
    is_homepage: bool = True
    product_ids: List[str] = []


class CatalogueUpdate(BaseModel):
    title: Optional[str] = None
    eyebrow: Optional[str] = None
    subtitle: Optional[str] = None
    category_link: Optional[str] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None
    is_homepage: Optional[bool] = None
    product_ids: Optional[List[str]] = None


class CatalogueResponse(BaseModel):
    id: str
    title: str
    eyebrow: Optional[str]
    subtitle: Optional[str]
    category_link: Optional[str]
    position: int
    is_active: bool
    is_homepage: bool
    product_ids: List[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CatalogueWithProducts(BaseModel):
    id: str
    title: str
    eyebrow: Optional[str]
    subtitle: Optional[str]
    category_link: Optional[str]
    position: int
    products: List[Any] = []

    model_config = {"from_attributes": True}
