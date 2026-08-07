from fastapi import APIRouter, BackgroundTasks, Depends, Request
from redis.asyncio import Redis

from core.redis import get_redis

from .schemas import OrderFunnelsEvent, ProductViewEvent, SearchTermEvent
from .service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_analytics_service(request: Request, redis: Redis = Depends(get_redis)):
    business_id = request.state.business_id
    if not business_id:
        import uuid

        business_id = str(uuid.uuid4())
    return AnalyticsService(redis, business_id)


@router.post("/events/product-view", status_code=202)
async def track_product_view(
    event: ProductViewEvent,
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
):
    # Process asynchronously to not block the API
    background_tasks.add_task(service.track_product_view, event)
    return {"status": "accepted"}


@router.post("/events/funnel-step", status_code=202)
async def track_funnel_step(
    event: OrderFunnelsEvent,
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
):
    background_tasks.add_task(service.track_funnel_step, event)
    return {"status": "accepted"}


@router.post("/events/search-term", status_code=202)
async def track_search_term(
    event: SearchTermEvent,
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
):
    background_tasks.add_task(service.track_search, event)
    return {"status": "accepted"}
