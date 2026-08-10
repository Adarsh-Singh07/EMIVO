from typing import Any, Optional, List
from pydantic import BaseModel
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    business_id: str

    class Config:
        from_attributes = True

class ProductMediaBase(BaseModel):
    media_url: str

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
    price: int

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantResponse(ProductVariantBase):
    id: str
    product_id: str

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    price: int
    description: Optional[str] = None
    sku: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = None
    description: Optional[str] = None
    sku: Optional[str] = None

class ProductResponse(ProductBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    # relations
    variants: Optional[List[ProductVariantResponse]] = None
    media: Optional[List[ProductMediaResponse]] = None

    class Config:
        from_attributes = True
