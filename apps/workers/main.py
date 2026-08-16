"""ELEKTRIX ARQ workers.

v0.2 jobs:
  - process_outbox_event: deliver one outbox event (email + in-app)
  - poll_outbox: cron poller claiming pending events (SKIP LOCKED) and
    dispatching them; retries with backoff via attempts, dead-letters at 5.

The notification streams (analytics/search) remain disabled for v0.2 —
their consumer loops were placeholders.
"""
import asyncio
import os
import structlog
from arq import cron
from arq.connections import RedisSettings
from typing import Any, Dict

logger = structlog.get_logger()

OUTBOX_BATCH = 20


async def _session():
    """Open an AsyncSession against the configured database (worker runs
    unrestricted; notification service sets RLS GUCs per event)."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    url = os.environ.get("DATABASE_URL", "")
    engine = create_async_engine(
        url,
        pool_size=5,
        max_overflow=2,
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0, "timeout": 30},
    )
    maker = async_sessionmaker(engine, expire_on_commit=False)
    return maker, engine


async def process_outbox_event(ctx, event_id: str) -> bool:
    from modules.notifications.service import NotificationService

    maker, engine = ctx.get("db") or (None, None)
    owns_session = maker is None
    if owns_session:
        maker, engine = await _session()
    try:
        async with maker() as session:
            service = NotificationService(session)
            return await service.process_outbox_event(event_id)
    finally:
        if owns_session:
            await engine.dispose()


async def poll_outbox(ctx) -> int:
    """Claim up to OUTBOX_BATCH pending events (FOR UPDATE SKIP LOCKED so
    multiple workers never double-process) and dispatch them."""
    from sqlalchemy import text

    maker, engine = ctx.get("db") or (None, None)
    owns_session = maker is None
    if owns_session:
        maker, engine = await _session()
    dispatched = 0
    try:
        async with maker() as session:
            rows = (await session.execute(text("""
                SELECT id FROM outbox_events
                WHERE status = 'pending' AND attempts < 5
                ORDER BY created_at ASC
                LIMIT :lim
                FOR UPDATE SKIP LOCKED
            """), {"lim": OUTBOX_BATCH})).fetchall()
            event_ids = [str(r[0]) for r in rows]
        # process each event in its own transaction/session
        for eid in event_ids:
            try:
                await process_outbox_event(ctx, eid)
                dispatched += 1
            except Exception as exc:
                logger.error("outbox dispatch failed", event_id=eid, error=str(exc))
        if event_ids:
            logger.info("outbox poll dispatched", count=dispatched, claimed=len(event_ids))
        return dispatched
    finally:
        if owns_session:
            await engine.dispose()


async def startup(ctx):
    logger.info("ARQ Worker starting up...")
    maker, engine = await _session()
    ctx["db"] = (maker, engine)


async def shutdown(ctx):
    logger.info("ARQ Worker shutting down...")
    db = ctx.get("db")
    if db:
        _, engine = db
        await engine.dispose()


redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class WorkerSettings:
    functions = [process_outbox_event]
    cron_jobs = [cron(poll_outbox, second=0, run_at_startup=True)]  # every minute
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(redis_url)
    max_jobs = 10
    job_timeout = 120
    keep_result = 3600


if __name__ == "__main__":
    logger.info("To run the worker, use: arq apps.workers.main.WorkerSettings")
