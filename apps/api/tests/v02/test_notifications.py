"""Notifications: outbox event → worker dispatch → in-app row + email send,
unread counts, mark-read. Coupons public validate + users/me profile."""
import uuid

import pytest

from conftest import ADDRESS, add_to_cart, get_store_products, register_and_login

pytestmark = pytest.mark.asyncio


async def _pending_events():
    from sqlalchemy import text
    from core.database import async_session_maker
    async with async_session_maker() as s:
        rows = (await s.execute(text(
            "SELECT id FROM outbox_events WHERE status = 'pending' ORDER BY created_at LIMIT 500"
        ))).fetchall()
        return [str(r[0]) for r in rows]


async def test_outbox_worker_delivers_notifications(client):
    buyer = await register_and_login(client, 800001)
    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer, products["items"][0]["id"], 1)
    r = await client.post("/api/v1/orders/checkout", headers=buyer["headers"],
                          json={"shipping_address": ADDRESS, "payment_method": "COD"})
    assert r.status_code == 201

    events = await _pending_events()
    assert events, "order.created event should be pending"

    # Run the worker dispatch (same code the ARQ cron executes)
    from modules.notifications.service import NotificationService
    from core.database import async_session_maker
    processed = 0
    async with async_session_maker() as s:
        service = NotificationService(s)
        for eid in events:
            ok = await service.process_outbox_event(eid)
            processed += 1 if ok else 0
    assert processed == len(events)

    # In-app notification center shows the order event
    r = await client.get("/api/v1/notifications", headers=buyer["headers"])
    assert r.status_code == 200
    body = r.json()
    assert body["unread_count"] >= 1
    assert any("order" in n["type"] for n in body["items"])

    # Mark one read
    nid = body["items"][0]["id"]
    r = await client.post(f"/api/v1/notifications/{nid}/read", headers=buyer["headers"])
    assert r.status_code == 200

    # Foreign notifications invisible
    other = await register_and_login(client, 800002)
    r = await client.get("/api/v1/notifications", headers=other["headers"])
    assert r.json()["unread_count"] == 0


async def test_coupon_validate_uses_token_identity(client):
    """Customer coupon validation: per-user limit check must use the JWT
    identity, and the endpoint must reject anonymous calls."""
    buyer = await register_and_login(client, 800003)
    r = await client.post("/api/v1/coupons/validate", json={
        "code": "WELCOME10", "cart_subtotal": 500000,
    })
    assert r.status_code in (401, 403)  # anonymous rejected

    r = await client.post("/api/v1/coupons/validate", headers=buyer["headers"], json={
        "code": "WELCOME10", "cart_subtotal": 500000,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["is_valid"] is True
    assert body["discount_amount"] == 50000  # 10% capped at ₹500

    r = await client.post("/api/v1/coupons/validate", headers=buyer["headers"], json={
        "code": "NOPE123", "cart_subtotal": 500000,
    })
    assert r.json()["is_valid"] is False


async def test_users_me_profile_update(client):
    buyer = await register_and_login(client, 800004)
    r = await client.put("/api/v1/users/me", headers=buyer["headers"], json={
        "first_name": "Renamed",
    })
    assert r.status_code == 200
    r = await client.get("/api/v1/users/me", headers=buyer["headers"])
    assert r.json()["first_name"] == "Renamed"
