from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class DashboardStats(BaseModel):
    """Real operational numbers for the admin dashboard."""
    today_orders: int
    today_revenue_paise: int
    pending_orders: int
    processing_orders: int
    low_stock_count: int
    out_of_stock_count: int
    pending_payments: int
    total_customers: int
    active_offers: int
    revenue_14d: List[dict] = []       # [{date, revenue_paise, orders}]
    recent_orders: List[dict] = []
    top_products_30d: List[dict] = []  # [{product_id, name, qty, revenue_paise}]


class AdminUser(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    is_active: bool
    roles: List[str] = []
    created_at: datetime


class AdminUserList(BaseModel):
    items: List[AdminUser]
    total: int
    page: int
    page_size: int


class StoreSettingsUpdate(BaseModel):
    cod_enabled: Optional[bool] = None
    cod_fee_paise: Optional[int] = None
    cod_max_order_paise: Optional[int] = None
    free_shipping_threshold_paise: Optional[int] = None
    flat_shipping_paise: Optional[int] = None
    banner_title: Optional[str] = None
    banner_subtitle: Optional[str] = None
    banner_image_url: Optional[str] = None
    banner_link: Optional[str] = None
    banner_active: Optional[bool] = None
    announcement: Optional[str] = None
    hero_slides: Optional[List[dict]] = None
    promo_tiles: Optional[List[dict]] = None


class StoreSettingsResponse(BaseModel):
    cod_enabled: bool
    cod_fee_paise: int
    cod_max_order_paise: int
    free_shipping_threshold_paise: int
    flat_shipping_paise: int
    banner: Optional[dict] = None
    announcement: Optional[str] = None
    hero_slides: Optional[List[dict]] = None
    promo_tiles: Optional[List[dict]] = None
