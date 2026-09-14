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


async def cart_reminders(ctx) -> int:
    """Abandoned-cart reminders: 30 minutes after leaving items in the cart
    ('stock won't wait') and again 3 days later. One send per stage per cart;
    guest carts (no user) and empty carts are skipped.

    Redis goes through ctx["redis"] (ARQ's own connection) — the singleton
    redis_manager is never connected inside the worker process.
    """
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import text
    from core.database import engine
    from core.models import OutboxEvent

    maker = async_sessionmaker(engine, expire_on_commit=False)
    sent = 0
    async with maker() as session:
        # Stage windows: 30-45 minutes and 3d-3d2h after last cart activity.
        # cart_items carries no denormalized product columns — join products
        # for the display name and price.
        rows = (await session.execute(text("""
            SELECT c.id, c.user_id, c.updated_at,
                   COALESCE(u.email, '') AS email, COALESCE(u.first_name, '') AS first_name,
                   (SELECT json_agg(json_build_object('name', p.name,
                                                      'unit_price', p.price))
                    FROM cart_items ci
                    JOIN products p ON p.id = ci.product_id
                    WHERE ci.cart_id = c.id) AS items
            FROM carts c
            JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL AND u.is_active
            WHERE c.updated_at < now() - interval '30 minutes'
              AND ( (c.updated_at > now() - interval '45 minutes')
                 OR (c.updated_at < now() - interval '3 days'
                     AND c.updated_at > now() - interval '3 days 2 hours') )
              AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
        """))).mappings().all()
        for r in rows:
            age = datetime.now(timezone.utc) - r["updated_at"].replace(tzinfo=timezone.utc)
            stage = "30m" if age < timedelta(hours=1) else "3d"
            dedup = f"cartrem:{r['id']}:{stage}"
            first = await ctx["redis"].set(dedup, "1", nx=True, ex=14 * 86400)
            if not first:
                continue
            session.add(OutboxEvent(
                tenant_id=None,
                type="cart.reminder",
                payload={
                    "user_id": r["user_id"],
                    "email": r["email"],
                    "first_name": r["first_name"],
                    "items": r["items"] or [],
                    "stage": stage,
                },
            ))
            sent += 1
        await session.commit()
    if sent:
        logger.info("cart_reminders: queued %s reminder emails", sent)
    return sent


async def expire_stale_orders(ctx) -> int:
    """Cancel unpaid/failed ONLINE orders past their 2-hour payment window and
    return their stock to the pool. Keeps the admin dashboard and customer
    order lists honest without anyone having to open the order first."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
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


async def low_stock_alert(ctx) -> int:
    """Notify staff when a product's available stock (on_hand - reserved)
    drops to its inventory row's low_stock_threshold. Alerts once per drop,
    escalates when the level falls further, and goes quiet for 24h after any
    alert (restocking resets the cycle once the key expires). Delivery:
    email digest to the admin@ alias + in-app notifications for staff users.
    Returns the number of products alerted in this run."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from core.database import engine
    from core.models import OutboxEvent
    from modules.notifications.models import Notification

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        rows = (await session.execute(text("""
            SELECT i.id AS inventory_id, (i.on_hand - i.reserved) AS available,
                   i.low_stock_threshold, p.name AS product_name, p.sku
            FROM inventory i
            JOIN products p ON p.id = i.product_id
            WHERE (i.on_hand - i.reserved) <= i.low_stock_threshold
              AND p.status = 'ACTIVE'
        """))).mappings().all()

        # Redis dedupe: key per inventory row holds the last alerted level.
        # No key -> first alert; key present and level fell further -> escalate;
        # level unchanged or higher -> quiet (restock clears via key expiry).
        alerted = []
        for r in rows:
            key = f"lowstock:{r['inventory_id']}"
            prev = await ctx["redis"].get(key)
            if prev is not None and r["available"] >= int(prev):
                continue
            await ctx["redis"].set(key, str(r["available"]), ex=86400)
            alerted.append(r)

        if not alerted:
            return 0

        from modules.notifications.aliases import ADMIN_INBOX
        items = [
            {"name": r["product_name"], "sku": r["sku"] or "",
             "available": r["available"], "threshold": r["low_stock_threshold"]}
            for r in alerted
        ]
        session.add(OutboxEvent(
            tenant_id=None,
            type="inventory.low_stock",
            # Dispatcher reads payload["email"] — the staff digest lands in
            # the admin@ inbox; from-address routing maps inventory.* to the
            # admin@ alias (modules/notifications/service.py).
            payload={"email": ADMIN_INBOX, "items": items, "count": len(items)},
        ))

        # In-app notifications for every staff member of the store tenant.
        from core.store import get_store_business_id
        bid = await get_store_business_id(session)
        staff_ids = (await session.execute(text("""
            SELECT DISTINCT u.id FROM users u
            JOIN business_members bm ON bm.user_id = u.id
            WHERE u.is_active AND u.deleted_at IS NULL
              AND bm.role IN ('platform_admin', 'owner', 'staff')
              AND bm.business_id = :bid
        """), {"bid": str(bid)})).scalars().all()
        names = ", ".join(i["name"] for i in items[:3]) + ("…" if len(items) > 3 else "")
        for uid in staff_ids:
            session.add(Notification(
                user_id=str(uid),
                type="inventory.low_stock",
                title="Low stock alert",
                body=f"{len(items)} product(s) at or below their low-stock threshold: {names}",
                link="/inventory",
                data={"items": items},
            ))
        await session.commit()
    logger.info("low_stock_alert: alerted on %s product(s)", len(alerted))
    return len(alerted)


class WorkerSettings:
    functions = [process_outbox_event, expire_stale_orders, cart_reminders, low_stock_alert]
    cron_jobs = [
        cron(poll_outbox, second={0, 10, 20, 30, 40, 50}, run_at_startup=True),  # every 10 seconds
        cron(expire_stale_orders, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),  # every 5 min
        cron(cart_reminders, minute=25, second=0),  # every hour at :25
        cron(low_stock_alert, minute=40, second=0),  # every hour at :40
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(redis_url)
    max_jobs = 10
    job_timeout = 120
    keep_result = 3600


if __name__ == "__main__":
    logger.info("To run the worker, use: arq apps.workers.main.WorkerSettings")
