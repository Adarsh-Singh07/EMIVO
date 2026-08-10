from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CartItemBase(BaseModel):
    product_id: str = Field(..., min_length=36, max_length=36)
    variant_id: Optional[str] = Field(None, min_length=36, max_length=36)
    quantity: int = Field(default=1, ge=1)


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItemResponse(CartItemBase):
    id: str
    cart_id: str
    unit_price: Optional[int] = None
    subtotal: Optional[int] = None
    product_name: Optional[str] = None
    variant_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CartBase(BaseModel):
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class CartCreate(CartBase):
    pass


class CartResponse(CartBase):
    id: str
    business_id: str
    subtotal: int = Field(default=0, description="Subtotal in minor units")
    expires_at: Optional[datetime] = None
    items: List[CartItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
