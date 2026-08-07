from fastapi import APIRouter, Depends, Query
from typing import Any, List, Optional
from pydantic import BaseModel

class RecommendationItem(BaseModel):
    product_id: str
    name: str
    price: float
    score: float
    reason: str

class RecommendationResponse(BaseModel):
    items: List[RecommendationItem]
    source: str
    tenant_key: str

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

async def get_current_tenant():
    class MockTenant:
        id = "tenant_123"
    return MockTenant()

class TenantRedis:
    """Mock Redis client handling tenant namespaces per Architecture 3.3."""
    def __init__(self, tenant_id: str):
        self.namespace = f"tenant:{tenant_id}:recommendations"
        
    async def get_popular_products(self, limit: int = 5):
        # Simulate fetching from redis namespace
        # e.g., ZRANGE f"{self.namespace}:popular"
        return [
            {"product_id": "prod_1", "name": "Smartphone X1", "price": 699.99, "score": 0.95, "reason": "Popular"},
            {"product_id": "prod_2", "name": "Wireless Earbuds", "price": 129.99, "score": 0.88, "reason": "Popular"},
            {"product_id": "prod_3", "name": "Smart Watch Pro", "price": 249.99, "score": 0.82, "reason": "Popular"},
            {"product_id": "prod_4", "name": "Laptop Stand", "price": 49.99, "score": 0.78, "reason": "Popular"},
            {"product_id": "prod_5", "name": "Noise Cancelling Headphones", "price": 199.99, "score": 0.75, "reason": "Popular"}
        ][:limit]
        
    async def get_similar_products(self, item_id: str, limit: int = 5):
        # Simulate ZRANGE f"{self.namespace}:similar:{item_id}"
        return [
            {"product_id": "prod_6", "name": f"Similar Item to {item_id}", "price": 89.99, "score": 0.91, "reason": "Co-occurrence"},
            {"product_id": "prod_7", "name": f"Accessory for {item_id}", "price": 29.99, "score": 0.85, "reason": "Frequently bought together"},
        ][:limit]

@router.get("/products", response_model=RecommendationResponse)
async def get_recommendations(
    rec_type: str = Query("popular", alias="type", description="Type of recommendation: popular or similar"),
    item_id: Optional[str] = Query(None, description="Item ID for similar recommendations"),
    limit: int = Query(5, description="Number of items to return"),
    tenant: Any = Depends(get_current_tenant)
):
    """
    Get offline batch recommendations (popular/co-occurrence/similar) derived from Redis.
    Uses TenantRedis key namespaces as mandated by architecture 3.3.
    """
    redis_client = TenantRedis(tenant_id=tenant.id)
    
    if rec_type == "similar" and item_id:
        items = await redis_client.get_similar_products(item_id, limit)
    else:
        items = await redis_client.get_popular_products(limit)
        
    response_items = [RecommendationItem(**item) for item in items]
    
    return RecommendationResponse(
        items=response_items,
        source="redis_offline_batch",
        tenant_key=redis_client.namespace
    )

