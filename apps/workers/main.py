import asyncio
import os
import structlog
from arq import Worker
from arq.connections import RedisSettings
from typing import Any, Dict

from src.analytics.worker import AnalyticsWorker
from src.search.worker import SearchStreamWorker, process_outbox_event_search

logger = structlog.get_logger()

async def process_outbox_event(ctx, event_type: str, payload: Dict[str, Any]):
    logger.info(f"Successfully polled outbox event: {event_type}", payload=payload)
    # We can also call the search function if desired, but here we just leave the placeholder
    return True

async def run_analytics_worker():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    worker = AnalyticsWorker(redis_url)
    await worker.connect()
    try:
        await worker.run_loop()
    finally:
        await worker.disconnect()

async def run_search_worker():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    worker = SearchStreamWorker(redis_url)
    await worker.connect()
    try:
        await worker.run_loop()
    finally:
        await worker.disconnect()

background_tasks = set()

async def startup(ctx):
    logger.info("ARQ Worker starting up...")
    
    task1 = asyncio.create_task(run_analytics_worker())
    background_tasks.add(task1)
    task1.add_done_callback(background_tasks.discard)
    
    task2 = asyncio.create_task(run_search_worker())
    background_tasks.add(task2)
    task2.add_done_callback(background_tasks.discard)

async def shutdown(ctx):
    logger.info("ARQ Worker shutting down...")
    for task in background_tasks:
        task.cancel()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class WorkerSettings:
    functions = [process_outbox_event, process_outbox_event_search]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(redis_url)

if __name__ == '__main__':
    logger.info("To run the worker, use: arq apps.workers.main.WorkerSettings")