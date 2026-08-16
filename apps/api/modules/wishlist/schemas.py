from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from modules.storefront.schemas import StoreProduct


class WishlistItemResponse(BaseModel):
    id: str
    product_id: str
    created_at: datetime
    product: Optional[StoreProduct] = None

    model_config = {"from_attributes": True}


class WishlistResponse(BaseModel):
    items: List[WishlistItemResponse]
    total: int
