import json
import logging

from redis.asyncio import Redis

from .schemas import OrderFunnelsEvent, ProductViewEvent, SearchTermEvent

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, redis: Redis, business_id: str):
        self.redis = redis
        # the key invariant requires specific prefixes!
        self.stream_key = f"tenant:{business_id}:analytics:events"

    async def _add_to_stream(self, event_type: str, event_data: dict):
        try:
            payload = {
                "event_type": event_type,
                "data": json.dumps(event_data, default=str),
            }
            await self.redis.xadd(self.stream_key, payload)
        except Exception as e:
            logger.error(
                f"Failed to record analytics event {event_type} to stream: {e!s}"
            )

    async def track_product_view(self, event: ProductViewEvent):
        await self._add_to_stream("product_view", event.model_dump())

    async def track_funnel_step(self, event: OrderFunnelsEvent):
        await self._add_to_stream("funnel_step", event.model_dump())

    async def track_search(self, event: SearchTermEvent):
        await self._add_to_stream("search_term", event.model_dump())
