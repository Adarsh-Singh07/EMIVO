from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# Media schemas
class ProductMediaBase(BaseModel):
    media_ref: str
    media_type: str
    position: int | None = 0


class ProductMediaCreate(ProductMediaBase):
    pass


class ProductMediaResponse(ProductMediaBase):
    id: str
    product_id: str

    model_config = ConfigDict(from_attributes=True)


# Variant schemas
class ProductVariantBase(BaseModel):
    sku: str
    name: str
    price: int  # integer money representation
    compare_at_price: int | None = None
    attributes: dict[str, Any] | None = Field(default_factory=dict)
    is_active: bool | None = True


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    price: int | None = None
    compare_at_price: int | None = None
    attributes: dict[str, Any] | None = None
    is_active: bool | None = None


class ProductVariantResponse(ProductVariantBase):
    id: str
    product_id: str
    stock_quantity: int
    reserved_quantity: int

    model_config = ConfigDict(from_attributes=True)


class InventoryAdjust(BaseModel):
    quantity: int
    reason: str | None = "manual_adjustment"


class InventoryReservation(BaseModel):
    quantity: int


# Product schemas
class ProductBase(BaseModel):
    name: str
    description: str | None = None
    slug: str
    category_id: str | None = None
    is_active: bool | None = True


class ProductCreate(ProductBase):
    variants: list[ProductVariantCreate] = []
    media: list[ProductMediaCreate] = []


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    slug: str | None = None
    category_id: str | None = None
    is_active: bool | None = None


class ProductResponse(ProductBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime | None = None

    variants: list[ProductVariantResponse] = []
    media: list[ProductMediaResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Category schemas
class CategoryBase(BaseModel):
    name: str
    slug: str
    parent_id: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
    business_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
