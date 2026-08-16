"""The oversell test: N buyers race for the last unit(s) of stock. Exactly the
available number of orders may succeed; stock can never go negative."""
import asyncio
import uuid

import pytest

from conftest import ADDRESS, add_to_cart, get_store_products, register_and_login

pytestmark = pytest.mark.asyncio


async def _set_stock(admin_headers, product_id: int, qty: int):
    from sqlalchemy import text
    from core.database import async_session_maker
    async with async_session_maker() as s:
        await s.execute(text("""
            UPDATE inventory SET on_hand = :q, reserved = 0, updated_at = now()
            WHERE product_id = :pid
        """), {"q": qty, "pid": product_id})
        await s.commit()


async def _inventory_state(product_id: str):
    from sqlalchemy import text
    from core.database import async_session_maker
    async with async_session_maker() as s:
        row = (await s.execute(text("""
            SELECT on_hand, reserved FROM inventory WHERE product_id = :pid
        """), {"pid": product_id})).one()
        return row.on_hand, row.reserved


async def test_concurrent_checkouts_cannot_oversell(client, admin):
    """10 buyers, 2 units of stock → exactly 2 orders, reserved == 2."""
    products = await get_store_products(client, in_stock=True)
    product = products["items"][0]
    await _set_stock(admin, product["id"], 2)

    buyers = [await register_and_login(client, 500000 + i) for i in range(10)]
    for b in buyers:
        await add_to_cart(client, b, product["id"], 1)

    results = await asyncio.gather(*[
        client.post("/api/v1/orders/checkout", headers=b["headers"],
                    json={"shipping_address": ADDRESS, "payment_method": "COD"})
        for b in buyers
    ], return_exceptions=True)

    statuses = [r.status_code if not isinstance(r, Exception) else 0 for r in results]
    created = statuses.count(201)
    rejected = sum(1 for s in statuses if s == 409)

    assert created == 2, f"expected exactly 2 winners, got {created}: {statuses}"
    assert rejected == 8
    assert all(s in (201, 409) for s in statuses)

    on_hand, reserved = await _inventory_state(product["id"])
    assert on_hand == 2
    assert reserved == 2
    assert on_hand - reserved == 0
    assert on_hand >= 0 and reserved >= 0  # never negative


async def test_concurrent_coupon_redemption_respects_limit(client, admin):
    """usage_limit=1 coupon, 6 buyers race → exactly 1 order carries it."""
    # dedicated coupon for this test
    code = f"RACE{uuid.uuid4().hex[:6].upper()}"
    from sqlalchemy import text
    from core.database import async_session_maker
    async with async_session_maker() as s:
        await s.execute(text("""
            INSERT INTO coupons (id, business_id, code, description, discount_type,
                discount_value, min_order_amount, usage_limit, usage_count, per_user_limit, is_active)
            SELECT :id, b.id, :code, 'race test', 'FIXED_AMOUNT', 5000, 0, 1, 0, 1, true
            FROM businesses b WHERE b.name = 'ELEKTRIX'
        """), {"id": str(uuid.uuid4()), "code": code})
        await s.commit()

    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["stock"]["available"] >= 6)
    await _set_stock(admin, product["id"], 50)

    buyers = [await register_and_login(client, 510000 + i) for i in range(6)]
    for b in buyers:
        await add_to_cart(client, b, product["id"], 1)

    results = await asyncio.gather(*[
        client.post("/api/v1/orders/checkout", headers=b["headers"],
                    json={"shipping_address": ADDRESS, "payment_method": "COD",
                          "coupon_code": code})
        for b in buyers
    ])
    statuses = [r.status_code for r in results]
    winners = [r for r in results if r.status_code == 201]
    assert len(winners) == 1, statuses
    assert winners[0].json()["order"]["discount_total"] == 5000
    assert statuses.count(400) == 5  # limit reached for the rest


async def test_admin_adjust_stock_with_audit_trail(client, admin):
    products = await get_store_products(client, in_stock=True)
    pid = products["items"][0]["id"]

    r = await client.post(f"/api/v1/inventory/{pid}/adjust", headers=admin,
                          json={"mode": "restock", "value": 10, "note": "test restock"})
    assert r.status_code == 200
    assert r.json()["on_hand"] == products["items"][0]["stock"]["on_hand"] + 10

    r = await client.get("/api/v1/inventory/movements", headers=admin,
                         params={"product_id": pid, "limit": 5})
    assert r.status_code == 200
    assert any(m["reason"] == "RESTOCK" for m in r.json()["items"])


async def test_inventory_rejects_set_below_reservations(client, admin):
    products = await get_store_products(client, in_stock=True)
    pid = products["items"][0]["id"]
    await _set_stock(admin, pid, 5)

    buyer = await register_and_login(client, 520001)
    await add_to_cart(client, buyer, pid, 3)
    r = await client.post("/api/v1/orders/checkout", headers=buyer["headers"],
                          json={"shipping_address": ADDRESS, "payment_method": "COD"})
    assert r.status_code == 201
    # 3 units reserved now — setting on_hand to 1 must be refused
    r = await client.post(f"/api/v1/inventory/{pid}/adjust", headers=admin,
                          json={"mode": "set", "value": 1})
    assert r.status_code == 409
