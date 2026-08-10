import asyncio
import uuid
import structlog
from typing import Any, Dict

logger = structlog.get_logger()


# Simple mock worker mimicking ARQ / Celery picking off Redis Streams
class NotificationWorker:
    def __init__(self, provider):
        self.provider = provider

    async def process_outbox_event(self, event_type: str, payload: Dict[str, Any]):
        logger.info(f"Worker picked up outbound notification event: {event_type}")

        if event_type == "OrderPlaced":
            email = payload.get("customer_email")
            order_id = payload.get("order_id")

            if email:
                await self.provider.send_email(
                    to_email=email,
                    subject=f"Order Confirmation #{order_id}",
                    template="order_placed",
                    context={"order": payload},
                )
