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

# Register all ORM models with Base.metadata (the notification service writes
# rows whose FKs span modules; in the API process main.py does this import).
import modules.users.models  # noqa: F401,E402
import modules.notifications.models  # noqa: F401,E402
import modules.orders.models  # noqa: F401,E402
import modules.payments.models  # noqa: F401,E402

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
                WHERE (status = 'pending'
                       OR (status = 'processing' AND created_at < now() - interval '10 minutes'))
                  AND attempts < 5
                ORDER BY created_at ASC
                LIMIT :lim
                FOR UPDATE SKIP LOCKED
            """), {"lim": OUTBOX_BATCH})).fetchall()
            event_ids = [str(r[0]) for r in rows]
            if event_ids:
                # Persist the claim INSIDE the locking transaction. Without
                # this, the row locks vanish when the session closes and a
                # second worker polling in the same window re-claims (and
                # re-sends) the same events — duplicate emails/notifications.
                # There is no updated_at column, so stale 'processing' rows
                # (crashed worker) are re-claimable via created_at age; the
                # dispatch path is at-least-once by design.
                await session.execute(text("""
                    UPDATE outbox_events
                    SET status = 'processing'
                    WHERE id::text = ANY(:ids)
                """), {"ids": event_ids})
                await session.commit()
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


async def expire_stale_orders(ctx) -> int:
    """Cancel unpaid/failed ONLINE orders past their 2-hour payment window and
    return their stock to the pool. Keeps the admin dashboard and customer
    order lists honest without anyone having to open the order first."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from core.database import engine
    from modules.orders.models import Order, OrderStatus
    from modules.orders.service import OrderService

    maker = async_sessionmaker(engine, expire_on_commit=False)
    count = 0
    async with maker() as session:
        svc = OrderService(session)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
        rows = (await session.execute(
            select(Order).where(
                Order.deleted_at.is_(None),
                Order.status.in_([OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED]),
                Order.payment_method == "ONLINE",
                Order.updated_at < cutoff,
            ).limit(200)
        )).scalars().all()
        for order in rows:
            try:
                before = order.status
                await svc.apply_payment_window(order)
                if order.status != before:
                    count += 1
            except Exception as exc:
                logger.warning("expire_stale_orders: order %s failed: %s", order.id, exc)
    if count:
        logger.info("expire_stale_orders: cancelled %s stale orders", count)
    return count


class WorkerSettings:
    functions = [process_outbox_event, expire_stale_orders]
    cron_jobs = [
        cron(poll_outbox, second={0, 10, 20, 30, 40, 50}, run_at_startup=True),  # every 10 seconds
        cron(expire_stale_orders, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),  # every 5 min
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(redis_url)
    max_jobs = 10
    job_timeout = 120
    keep_result = 3600


if __name__ == "__main__":
    logger.info("To run the worker, use: arq apps.workers.main.WorkerSettings")
