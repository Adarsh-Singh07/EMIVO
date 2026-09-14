"""Admin ops: abandoned-carts list + manual nudge, and the low-stock alert
worker job (dedupe, outbox digest event, staff in-app notifications)."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import redis.asyncio as aioredis
from sqlalchemy import text

from conftest import add_to_cart, get_store_products

pytestmark = pytest.mark.asyncio

LIST = "/api/v1/admin/abandoned-carts"


def _redis():
    return aioredis.from_url(os.environ["REDIS_URL"], decode_responses=True)


async def _touch_cart_idle(cart_id: str, minutes: int = 120):
    """Backdate a cart's updated_at so it counts as abandoned."""
    async with _session() as session:
        await session.execute(
            text("UPDATE carts SET updated_at = now() - (:mins || ' minutes')::interval WHERE id = :cid"),
            {"mins": str(minutes), "cid": cart_id},
        )
        await session.commit()


def _session():
    from core.database import async_session_maker
    return async_session_maker()


async def _outbox_count(email: str = None, etype: str = "cart.reminder") -> int:
    async with _session() as session:
        if email:
            res = await session.execute(
                text("SELECT COUNT(*) FROM outbox_events WHERE type = :t AND payload->>'email' = :e"),
                {"t": etype, "e": email},
            )
        else:
            res = await session.execute(
                text("SELECT COUNT(*) FROM outbox_events WHERE type = :t"), {"t": etype}
            )
        return res.scalar()


async def test_abandoned_carts_auth_boundary(client, buyer):
    r = await client.get(LIST)
    assert r.status_code == 401
    r = await client.get(LIST, headers=buyer["headers"])
    assert r.status_code == 403


async def test_abandoned_carts_list(client, admin, buyer):
    product_id = (await get_store_products(client))["items"][0]["id"]
    cart_id = await add_to_cart(client, buyer, product_id)

    # Fresh cart: NOT abandoned yet.
    r = await client.get(f"{LIST}?minutes=30", headers=admin)
    assert r.status_code == 200
    assert all(c["id"] != cart_id for c in r.json())

    # Backdate beyond the idle window → appears with items and value.
    await _touch_cart_idle(cart_id)
    r = await client.get(f"{LIST}?minutes=30", headers=admin)
    carts = {c["id"]: c for c in r.json()}
    assert cart_id in carts
    entry = carts[cart_id]
    assert entry["email"] == buyer["email"]
    assert not entry["is_guest"]
    assert len(entry["items"]) >= 1
    assert entry["items"][0]["name"]
    assert entry["subtotal"] > 0

    # Tight window (5 min) excludes a 2h-old cart is wrong direction —
    # minutes widens the net, so 4h idle with 5-minute window still shows.
    r = await client.get(f"{LIST}?minutes=5", headers=admin)
    assert any(c["id"] == cart_id for c in r.json())


async def test_manual_nudge_queues_and_dedupes(client, admin, buyer):
    product_id = (await get_store_products(client))["items"][0]["id"]
    cart_id = await add_to_cart(client, buyer, product_id)

    before = await _outbox_count(email=buyer["email"])
    r = await client.post(f"{LIST}/{cart_id}/nudge", headers=admin)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "queued"
    assert r.json()["email"] == buyer["email"]
    assert (await _outbox_count(email=buyer["email"])) == before + 1

    # 6-hour dedupe: the second nudge is refused.
    r = await client.post(f"{LIST}/{cart_id}/nudge", headers=admin)
    assert r.status_code == 429

    r = await client.post(f"{LIST}/no-such-cart/nudge", headers=admin)
    assert r.status_code == 404

    async with _session() as session:
        # cart_items has no ON DELETE cascade on cart_id — children go first.
        await session.execute(text("DELETE FROM cart_items WHERE cart_id = :cid"), {"cid": cart_id})
        await session.execute(text("DELETE FROM carts WHERE id = :cid"), {"cid": cart_id})
        await session.commit()


async def test_guest_carts_cannot_be_nudged(client, admin):
    """Guest carts appear in the list but have no inbox to nudge."""
    # Build a guest cart through the anonymous session flow.
    r = await client.get("/api/v1/carts", headers={"X-Cart-Session": "guest-test-session-0001"})
    assert r.status_code == 200
    cart_id = r.json()["id"]
    product_id = (await get_store_products(client))["items"][0]["id"]
    r = await client.post(
        f"/api/v1/carts/{cart_id}/items",
        headers={"X-Cart-Session": "guest-test-session-0001"},
        json={"product_id": product_id, "quantity": 1},
    )
    assert r.status_code == 201, r.text

    r = await client.post(f"{LIST}/{cart_id}/nudge", headers=admin)
    assert r.status_code == 400
    assert "email" in r.json()["detail"].lower()

    async with _session() as session:
        # cart_items has no ON DELETE cascade on cart_id — children go first.
        await session.execute(text("DELETE FROM cart_items WHERE cart_id = :cid"), {"cid": cart_id})
        await session.execute(text("DELETE FROM carts WHERE id = :cid"), {"cid": cart_id})
        await session.commit()


async def test_low_stock_alert_worker_job(client, admin):
    """Drop one product's stock below its threshold, run the worker job
    directly, and assert digest event + staff in-app notifications + dedupe."""
    # The worker image adds /app/apps/workers to PYTHONPATH; the API test
    # image does not, so extend the path for this import.
    import sys
    if "/app" not in sys.path:
        sys.path.insert(0, "/app")
    from apps.workers.main import low_stock_alert

    async with _session() as session:
        row = (await session.execute(text("""
            SELECT i.id FROM inventory i
            JOIN products p ON p.id = i.product_id AND p.status = 'ACTIVE'
            ORDER BY random() LIMIT 1
        """))).first()
        assert row, "seeded inventory expected"
        inv_id = str(row[0])
        await session.execute(
            text("UPDATE inventory SET on_hand = 1, reserved = 0 WHERE id = :id"),
            {"id": inv_id},
        )
        outbox_before = (await session.execute(
            text("SELECT COUNT(*) FROM outbox_events WHERE type = 'inventory.low_stock'")
        )).scalar()
        notif_before = (await session.execute(
            text("SELECT COUNT(*) FROM notifications WHERE type = 'inventory.low_stock'")
        )).scalar()
        await session.commit()

    rds = _redis()
    await rds.delete(f"lowstock:{inv_id}")
    ctx = {"redis": rds}
    alerted = await low_stock_alert(ctx)
    # Our product alerted — other seeded rows may legitimately be low too.
    assert alerted >= 1

    async with _session() as session:
        events = (await session.execute(
            text("""
                SELECT payload->>'email', payload->>'count'
                FROM outbox_events WHERE type = 'inventory.low_stock'
                ORDER BY created_at DESC LIMIT 1
            """)
        )).first()
        assert events[0] == "admin@elektrix.in"
        assert int(events[1]) >= 1
        notifs = (await session.execute(
            text("SELECT COUNT(*) FROM notifications WHERE type = 'inventory.low_stock'")
        )).scalar()
        assert notifs > notif_before  # at least the seeded owner got one

    # Dedupe: unchanged stock level → no second alert.
    assert await low_stock_alert(ctx) == 0

    await rds.delete(f"lowstock:{inv_id}")
    await rds.aclose()
