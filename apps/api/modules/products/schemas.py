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
    icon: Optional[str] = None
    keywords: Optional[str] = None
    slug: Optional[str] = None
    position: int = 0
    image_url: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None
    slug: Optional[str] = None
    position: Optional[int] = None
    image_url: Optional[str] = None
    icon: Optional[str] = None
    keywords: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
    business_id: str
    # children intentionally omitted to prevent lazy load crashes

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
    attributes: Optional[dict] = None
    is_active: bool = True


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[int] = Field(default=None, gt=0)
    attributes: Optional[dict] = None
    is_active: Optional[bool] = None
    id: Optional[str] = None


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
    status: Optional[str] = Field(default="ACTIVE", pattern="^(DRAFT|ACTIVE|ARCHIVED|COMING_SOON)$")
    featured: bool = False
    category_id: Optional[str] = None
    return_policy: Optional[str] = None
    warranty_info: Optional[str] = None
    specs: Optional[List[SpecRow]] = None
    tags: Optional[List[str]] = None
    options: Optional[List[dict]] = None
    variants: Optional[List[ProductVariantUpdate]] = None


class ProductCreate(ProductBase):
    media: Optional[List[ProductMediaCreate]] = None
    initial_stock: Optional[int] = Field(default=None, ge=0)
    variants: Optional[List[ProductVariantCreate]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = Field(default=None, gt=0)
    attributes: Optional[dict] = None
    is_active: Optional[bool] = None
    id: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    mrp: Optional[int] = None
    sale_price: Optional[int] = None
    offer_starts_at: Optional[datetime] = None
    offer_ends_at: Optional[datetime] = None
    brand: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(DRAFT|ACTIVE|ARCHIVED|COMING_SOON)$")
    featured: Optional[bool] = None
    category_id: Optional[str] = None
    return_policy: Optional[str] = None
    warranty_info: Optional[str] = None
    specs: Optional[List[SpecRow]] = None
    tags: Optional[List[str]] = None
    options: Optional[List[dict]] = None
    variants: Optional[List[ProductVariantUpdate]] = None


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



