"""Payment retry window: failed online payments stay retryable for 2 hours,
stock is released back to the pool after 30 minutes, and the order is
cancelled once the window expires."""
import uuid

import pytest
from sqlalchemy import text

from conftest import register_and_login, get_store_products

pytestmark = pytest.mark.asyncio


async def _place_and_fail(client, buyer, n: int) -> dict:
    """Checkout an ONLINE order and fail its payment via a bad signature."""
    from test_payments import _place_pending_online_order, _initiate

    order = await _place_pending_online_order(client, buyer)
    r = await _initiate(client, buyer, order)
    assert r.status_code == 201, r.text
    payment_id = r.json()["payment"]["id"]

    # A wrong mock-provider signature fails the payment (signature_verified
    # path → _fail). Order must land in PAYMENT_FAILED, stock still held.
    r = await client.post(
        f"/api/v1/payments/{payment_id}/verify-success",
        headers=buyer["headers"],
        json={
            "provider_payment_id": f"pp-{uuid.uuid4().hex[:8]}",
            "provider_signature": "definitely-wrong",
        },
    )
    assert r.status_code == 400, r.text

    r = await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])
    assert r.json()["status"] == "PAYMENT_FAILED"
    return order


async def _age_order(order_id: str, minutes: int) -> None:
    """Time-travel the order's updated_at so the lazy window logic fires."""
    from core.database import async_session_maker
    from sqlalchemy import text
    async with async_session_maker() as s:
        await s.execute(text(
            "UPDATE orders SET updated_at = now() - make_interval(mins => :m) WHERE id = :id"
        ), {"m": minutes, "id": order_id})
        await s.commit()


async def test_failed_payment_retries_and_captures_within_window(client):
    buyer = await register_and_login(client, 610001)
    order = await _place_and_fail(client, buyer, 1)

    # Retry initiation inside the window must be accepted…
    r = await client.post("/api/v1/payments/initiate", headers=buyer["headers"], json={
        "order_id": order["id"], "idempotency_key": f"retry-{uuid.uuid4().hex}",
    })
    assert r.status_code == 201, r.text
    payment_id = r.json()["payment"]["id"]

    # …and a good signature on the retry captures and confirms the order.
    r = await client.post(
        f"/api/v1/payments/{payment_id}/verify-success",
        headers=buyer["headers"],
        json={"provider_payment_id": f"pp-{uuid.uuid4().hex[:8]}", "provider_signature": "valid_mock_signature"},
    )
    assert r.status_code == 200, r.text
    r = await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])
    assert r.json()["status"] == "CONFIRMED"


async def test_stock_released_after_30_min_then_rereserved_on_retry(client):
    buyer = await register_and_login(client, 610002)
    order = await _place_and_fail(client, buyer, 2)

    products = await get_store_products(client)
    pid = order["items"][0]["product_id"]
    hold = next(p for p in products["items"] if p["id"] == pid)["stock"]

    # After 30 minutes the reservation returns to the general pool
    # (lazily, on the next order read)…
    await _age_order(order["id"], 31)
    r = await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])
    assert r.status_code == 200, r.text
    products = await get_store_products(client)
    after = next(p for p in products["items"] if p["id"] == pid)["stock"]
    assert after["reserved"] == hold["reserved"] - order["items"][0]["quantity"]
    assert after["available"] >= hold["available"]

    # …and a retry re-reserves the stock and goes through.
    r = await client.post("/api/v1/payments/initiate", headers=buyer["headers"], json={
        "order_id": order["id"], "idempotency_key": f"retry-{uuid.uuid4().hex}",
    })
    assert r.status_code == 201, r.text

    order_after = (await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])).json()
    assert order_after["status"] == "PENDING"


async def test_retry_window_expires_after_2_hours(client):
    buyer = await register_and_login(client, 610003)
    order = await _place_and_fail(client, buyer, 3)

    await _age_order(order["id"], 121)

    r = await client.post("/api/v1/payments/initiate", headers=buyer["headers"], json={
        "order_id": order["id"], "idempotency_key": f"retry-{uuid.uuid4().hex}",
    })
    assert r.status_code == 409, r.text
    assert r.json()["code"] == "PAYMENT_WINDOW_EXPIRED"

    r = await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])
    assert r.json()["status"] == "CANCELLED"
