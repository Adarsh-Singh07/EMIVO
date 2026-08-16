from typing import Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


def _slugify(value: str) -> str:
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:200] or "product"


class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[str] = None
    slug: Optional[str] = None
    position: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
    business_id: str
    children: Optional[List["CategoryResponse"]] = None

    class Config:
        from_attributes = True


class ProductMediaBase(BaseModel):
    media_url: str
    position: int = 0
    alt_text: Optional[str] = None


class ProductMediaCreate(ProductMediaBase):
    pass


class ProductMediaResponse(ProductMediaBase):
    id: str
    product_id: str

    class Config:
        from_attributes = True


class ProductVariantBase(BaseModel):
    name: str
    sku: Optional[str] = None
    price: int = Field(..., gt=0, description="Selling price in paise")


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[int] = Field(default=None, gt=0)


class ProductVariantResponse(ProductVariantBase):
    id: str
    product_id: str

    class Config:
        from_attributes = True


class SpecRow(BaseModel):
    name: str
    value: str


class ProductBase(BaseModel):
    name: str
    price: int = Field(..., gt=0, description="Everyday selling price in paise")
    description: Optional[str] = None
    sku: Optional[str] = None
    mrp: Optional[int] = Field(default=None, gt=0, description="List price (MRP) in paise")
    sale_price: Optional[int] = Field(default=None, gt=0, description="Festival offer price in paise")
    offer_starts_at: Optional[datetime] = None
    offer_ends_at: Optional[datetime] = None
    brand: Optional[str] = None
    status: Optional[str] = Field(default="ACTIVE", pattern="^(DRAFT|ACTIVE|ARCHIVED)$")
    featured: bool = False
    category_id: Optional[str] = None
    specs: Optional[List[SpecRow]] = None
    tags: Optional[List[str]] = None


class ProductCreate(ProductBase):
    media: Optional[List[ProductMediaCreate]] = None
    initial_stock: Optional[int] = Field(default=None, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = Field(default=None, gt=0)
    description: Optional[str] = None
    sku: Optional[str] = None
    mrp: Optional[int] = None
    sale_price: Optional[int] = None
    offer_starts_at: Optional[datetime] = None
    offer_ends_at: Optional[datetime] = None
    brand: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(DRAFT|ACTIVE|ARCHIVED)$")
    featured: Optional[bool] = None
    category_id: Optional[str] = None
    specs: Optional[List[SpecRow]] = None
    tags: Optional[List[str]] = None


class ProductResponse(ProductBase):
    id: str
    business_id: str
    slug: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # relations
    variants: Optional[List[ProductVariantResponse]] = None
    media: Optional[List[ProductMediaResponse]] = None

    class Config:
        from_attributes = True


CategoryResponse.model_rebuild()
