import asyncio
import logging
from typing import Any

from arq.connections import RedisSettings

from core.database import tenant_context

logger = logging.getLogger(__name__)


async def process_outbox_event(
    ctx: dict[Any, Any], tenant_id: str, event_type: str, payload: dict[str, Any]
):
    """Process an event from the outbox."""
    # Ensure tenant context is set for the background task
    token = tenant_context.set(tenant_id)
    try:
        logger.info(f"Processing {event_type} for tenant {tenant_id}: {payload}")
        # Add actual processing logic here
        await asyncio.sleep(0.1)  # Simulate work
    except Exception as e:
        logger.error(f"Failed to process {event_type} for tenant {tenant_id}: {e}")
        raise
    finally:
        tenant_context.reset(token)


class WorkerSettings:
    functions = [process_outbox_event]
    redis_settings = RedisSettings()

    @staticmethod
    async def on_startup(ctx: dict[Any, Any]):
        logger.info("Outbox worker starting up")

    @staticmethod
    async def on_shutdown(ctx: dict[Any, Any]):
        logger.info("Outbox worker shutting down")
