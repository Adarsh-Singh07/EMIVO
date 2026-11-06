from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr


class SellerOtpRequest(BaseModel):
    email: EmailStr


class SellerOtpVerify(BaseModel):
    email: EmailStr
    code: str


class SellerResponse(BaseModel):
    id: str
    name: str
    business_name: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    status: str
    rating: float
    rating_count: int
    created_at: Optional[datetime] = None


class SellerCreateAdmin(BaseModel):
    name: str
    business_name: str
    email: EmailStr
    phone: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    commission_rate: Optional[float] = 0.0


class SellerStatusUpdate(BaseModel):
    status: str  # ACTIVE or SUSPENDED


class SellerProductItem(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    sku: Optional[str] = None
    brand: Optional[str] = None
    price: int  # paise
    mrp: Optional[int] = None  # paise
    sale_price: Optional[int] = None
    stock: int
    status: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    parent_category_name: Optional[str] = None
    images: List[str] = []
    created_at: Optional[datetime] = None


class SellerProductCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category_id: Optional[str] = None
    price: int  # rupees input in frontend, converted to paise
    mrp: Optional[int] = None
    stock: int = 10
    sku: Optional[str] = None
    description: Optional[str] = None
    specs: Optional[List[Dict[str, str]]] = None
    images: Optional[List[str]] = None


class SellerProductUpdate(BaseModel):
    price: Optional[int] = None
    mrp: Optional[int] = None
    stock: Optional[int] = None
    status: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None


class SellerOrderItem(BaseModel):
    order_id: str
    order_number: Optional[str] = None
    item_id: str
    product_id: str
    product_name: str
    variant_name: Optional[str] = None
    quantity: int
    unit_price: int
    total: int
    fulfillment_status: str  # PENDING, PACKED, SHIPPED, DELIVERED
    customer_city: Optional[str] = None
    customer_pincode: Optional[str] = None
    created_at: Optional[datetime] = None


class CategorySuggestion(BaseModel):
    name: str
    parent_id: Optional[str] = None


class CategoryApprovalItem(BaseModel):
    id: str
    name: str
    slug: str
    parent_id: Optional[str] = None
    parent_name: Optional[str] = None
    requested_by_seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
