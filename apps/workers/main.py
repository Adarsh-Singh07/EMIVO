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


async def flash_sale_sync(ctx) -> int:
    """Keep products.is_flash_sale true exactly inside the offer window
    (sale_price + offer_starts_at + offer_ends_at all set). The flag drives
    immediate stock release on cancel, so it must track the window even if
    the window was edited after the fact."""
    from sqlalchemy import text
    from core.database import engine

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        res = await session.execute(text("""
            WITH turn_on AS (
                UPDATE products SET is_flash_sale = true, updated_at = now()
                WHERE is_flash_sale = false
                  AND sale_price IS NOT NULL AND sale_price > 0
                  AND offer_starts_at IS NOT NULL AND offer_ends_at IS NOT NULL
                  AND now() >= offer_starts_at AND now() <= offer_ends_at
                RETURNING 1
            ), turn_off AS (
                UPDATE products SET is_flash_sale = false, updated_at = now()
                WHERE is_flash_sale = true
                  AND (
                    sale_price IS NULL OR sale_price <= 0
                    OR offer_starts_at IS NULL OR offer_ends_at IS NULL
                    OR now() < offer_starts_at OR now() > offer_ends_at
                  )
                RETURNING 1
            )
            SELECT (SELECT COUNT(*) FROM turn_on) + (SELECT COUNT(*) FROM turn_off) AS changed
        """))
        changed = res.scalar() or 0
        await session.commit()
    if changed:
        logger.info("flash_sale_sync: toggled %s product(s)", changed)
    return changed


async def weekly_digest(ctx) -> int:
    """Monday-morning business digest to the admin@ inbox: last-7-day orders,
    revenue, new customers, abandoned-cart value and low-stock count."""
    from sqlalchemy import text
    from core.database import engine
    from core.models import OutboxEvent
    from modules.notifications.aliases import ADMIN_INBOX

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        m = (await session.execute(text("""
            SELECT
              (SELECT COUNT(*) FROM orders
                WHERE created_at > now() - interval '7 days' AND deleted_at IS NULL) AS orders,
              (SELECT COALESCE(SUM(total), 0) FROM orders
                WHERE created_at > now() - interval '7 days' AND deleted_at IS NULL
                  AND status NOT IN ('PENDING', 'PAYMENT_FAILED', 'CANCELLED')) AS revenue,
              (SELECT COUNT(*) FROM orders
                WHERE created_at > now() - interval '7 days' AND deleted_at IS NULL
                  AND status = 'CANCELLED') AS cancelled,
              (SELECT COUNT(*) FROM users
                WHERE created_at > now() - interval '7 days' AND is_active) AS new_customers,
              (SELECT COUNT(*) FROM payments
                WHERE created_at > now() - interval '7 days' AND status = 'FAILED') AS failed_payments,
              (SELECT COALESCE(SUM(c.subtotal), 0) FROM carts c
                WHERE c.updated_at < now() - interval '30 minutes'
                  AND c.updated_at > now() - interval '7 days'
                  AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)) AS abandoned_value,
              (SELECT COUNT(*) FROM inventory i
                JOIN products p ON p.id = i.product_id AND p.status = 'ACTIVE'
                WHERE (i.on_hand - i.reserved) <= i.low_stock_threshold) AS low_stock,
              (SELECT COUNT(*) FROM support_tickets
                WHERE created_at > now() - interval '7 days') AS tickets
        """))).mappings().one()

        # Nothing worth reporting — stay quiet rather than sending empty mail.
        if not m["orders"] and not m["new_customers"]:
            return 0

        session.add(OutboxEvent(
            tenant_id=None,
            type="admin.weekly_digest",
            payload={
                "email": ADMIN_INBOX,
                "orders": m["orders"], "revenue": int(m["revenue"]),
                "cancelled": m["cancelled"], "new_customers": m["new_customers"],
                "failed_payments": m["failed_payments"],
                "abandoned_value": int(m["abandoned_value"] or 0),
                "low_stock": m["low_stock"], "tickets": m["tickets"],
            },
        ))
        await session.commit()
    logger.info("weekly_digest: queued admin digest")
    return 1


class WorkerSettings:
    functions = [process_outbox_event, expire_stale_orders, cart_reminders, low_stock_alert,
                 flash_sale_sync, weekly_digest]
    cron_jobs = [
        cron(poll_outbox, second={0, 10, 20, 30, 40, 50}, run_at_startup=True),  # every 10 seconds
        cron(expire_stale_orders, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),  # every 5 min
        cron(flash_sale_sync, minute={0, 10, 20, 30, 40, 50}),  # every 10 min
        cron(cart_reminders, minute=25, second=0),  # every hour at :25
        cron(low_stock_alert, minute=40, second=0),  # every hour at :40
        # Monday 09:00 IST (03:30 UTC). arq weekday: 0 = Monday.
        cron(weekly_digest, day_of_week=0, hour=3, minute=30, second=0),
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(redis_url)
    max_jobs = 10
    job_timeout = 120
    keep_result = 3600


if __name__ == "__main__":
    logger.info("To run the worker, use: arq apps.workers.main.WorkerSettings")
