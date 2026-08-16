from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class StockInfo(BaseModel):
    on_hand: int
    reserved: int
    available: int
    in_stock: bool


class StoreCategory(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    parent_id: Optional[str] = None
    product_count: int = 0
    children: List["StoreCategory"] = []


class StoreVariant(BaseModel):
    id: str
    name: str
    sku: Optional[str] = None
    price: int


class StoreProduct(BaseModel):
    """Storefront product card / detail with server-computed pricing.

    All prices are integer paise. effective_price is what the customer pays;
    discount_percent is computed against MRP for display.
    """
    id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    category_slug: Optional[str] = None

    price: int                    # everyday selling price (paise)
    mrp: Optional[int] = None     # list price (paise)
    effective_price: int          # what the customer pays now (paise)
    discount_percent: int = 0     # vs MRP, for display
    on_offer: bool = False

    status: str = "ACTIVE"
    featured: bool = False
    specs: Optional[List[dict]] = None
    tags: Optional[List[str]] = None

    images: List[str] = []
    variants: List[StoreVariant] = []
    stock: Optional[StockInfo] = None

    created_at: Optional[datetime] = None


class StoreProductList(BaseModel):
    items: List[StoreProduct]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class SearchSuggestion(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    brand: Optional[str] = None
    image: Optional[str] = None
    effective_price: int
