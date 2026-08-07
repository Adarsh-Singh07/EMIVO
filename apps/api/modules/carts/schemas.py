from datetime import datetime

from pydantic import BaseModel, Field


class CartItemBase(BaseModel):
    product_id: str
    variant_id: str | None = None
    quantity: int = Field(default=1, ge=1)


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItem(CartItemBase):
    id: str
    cart_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CartBase(BaseModel):
    user_id: str | None = None
    session_id: str | None = None


class CartCreate(CartBase):
    pass


class Cart(CartBase):
    id: str
    tenant_id: str
    subtotal: int = Field(default=0, description="Total in minor integer format")
    expires_at: datetime | None = None
    items: list[CartItem] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
