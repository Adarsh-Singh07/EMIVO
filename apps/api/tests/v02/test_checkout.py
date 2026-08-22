"""Checkout money path: COD, ONLINE, coupons, shipping rules, idempotency,
and the customer-side authorization boundaries."""
import uuid

import pytest

from conftest import ADDRESS, add_to_cart, get_store_products, register_and_login

pytestmark = pytest.mark.asyncio


async def _checkout(client, buyer, **overrides):
    payload = {
        "shipping_address": ADDRESS,
        "payment_method": "COD",
        **overrides,
    }
    return await client.post("/api/v1/orders/checkout", headers=buyer["headers"], json=payload)


async def test_cod_checkout_reserves_stock(client):
    buyer = await register_and_login(client, 999001)
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["stock"]["available"] >= 3)
    await add_to_cart(client, buyer, product["id"], 2)

    r = await _checkout(client, buyer)
    assert r.status_code == 201, r.text
    order = r.json()["order"]
    assert order["status"] == "CONFIRMED"
    assert order["payment_method"] == "COD"
    assert order["order_number"].startswith("ELK-")
    assert order["total"] == product["effective_price"] * 2 + 5000  # 5000 is the COD fee
    assert order["shipping_address"]["pincode"] == "560001"

    # Stock reserved: available dropped by 2
    detail = (await client.get(f"/api/v1/store/products/{product['slug']}")).json()
    assert detail["stock"]["available"] == product["stock"]["available"] - 2
    assert detail["stock"]["reserved"] == product["stock"]["reserved"] + 2

    # Cart consumed
    cart = (await client.get("/api/v1/carts", headers=buyer["headers"])).json()
    assert cart["items"] == []


async def test_checkout_shipping_and_coupon_math(client):
    buyer = await register_and_login(client, 999002)
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["effective_price"] >= 200000)

    await add_to_cart(client, buyer, product["id"], 1)

    # WELCOME10: 10% capped at ₹500, min order ₹2000
    r = await _checkout(client, buyer, coupon_code="WELCOME10")
    assert r.status_code == 201, r.text
    order = r.json()["order"]

    unit = product["effective_price"]
    expected_discount = min(int(unit * 10 / 100), 50000)
    # free shipping applies at/above ₹999. COD fee is ₹50 (5000 paise)
    shipping = 0 if unit >= 99900 else 9900
    cod_fee = 5000
    assert order["subtotal"] == unit
    assert order["discount_total"] == expected_discount
    assert order["shipping_total"] == shipping + cod_fee
    assert order["total"] == unit - expected_discount + shipping + cod_fee
    assert order["coupon_code"] == "WELCOME10"


async def test_coupon_per_user_limit_enforced(client):
    buyer = await register_and_login(client, 999003)
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["effective_price"] >= 200000)

    await add_to_cart(client, buyer, product["id"], 1)
    r = await _checkout(client, buyer, coupon_code="WELCOME10")
    assert r.status_code == 201

    await add_to_cart(client, buyer, product["id"], 1)
    r = await _checkout(client, buyer, coupon_code="WELCOME10")
    assert r.status_code == 400
    assert r.json()["code"] == "COUPON_USER_LIMIT"


async def test_coupon_min_order_rejected(client):
    buyer = await register_and_login(client, 999004)
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["effective_price"] < 200000)
    await add_to_cart(client, buyer, product["id"], 1)

    r = await _checkout(client, buyer, coupon_code="WELCOME10")
    assert r.status_code == 400
    assert r.json()["code"] == "COUPON_MIN_ORDER"


async def test_checkout_idempotency(client):
    buyer = await register_and_login(client, 999005)
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["stock"]["available"] >= 2)
    await add_to_cart(client, buyer, product["id"], 1)

    key = f"idem-{uuid.uuid4().hex}"
    r1 = await _checkout(client, buyer, idempotency_key=key)
    assert r1.status_code == 201
    # second attempt with the same key: same order, no duplicate
    await add_to_cart(client, buyer, product["id"], 1)
    r2 = await _checkout(client, buyer, idempotency_key=key)
    assert r2.status_code == 201
    assert r2.json()["order"]["id"] == r1.json()["order"]["id"]

    from sqlalchemy import text
    from core.database import async_session_maker
    async with async_session_maker() as s:
        count = (await s.execute(text(
            "SELECT count(*) FROM orders WHERE idempotency_key = :k"
        ), {"k": key})).scalar()
    assert count == 1


async def test_checkout_requires_address(client):
    buyer = await register_and_login(client, 999006)
    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer, products["items"][0]["id"], 1)
    r = await client.post("/api/v1/orders/checkout", headers=buyer["headers"],
                          json={"payment_method": "COD"})
    assert r.status_code == 400


async def test_checkout_rejects_invalid_pincode_and_phone(client):
    buyer = await register_and_login(client, 999007)
    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer, products["items"][0]["id"], 1)
    r = await _checkout(client, buyer, shipping_address={**ADDRESS, "pincode": "12345"})
    assert r.status_code == 422
    r = await _checkout(client, buyer, shipping_address={**ADDRESS, "phone": "abc"})
    assert r.status_code == 422


async def test_order_ownership_idor(client):
    buyer_a = await register_and_login(client, 999008)
    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer_a, products["items"][0]["id"], 1)
    order = (await _checkout(client, buyer_a)).json()["order"]

    buyer_b = await register_and_login(client, 999009)
    r = await client.get(f"/api/v1/orders/{order['id']}", headers=buyer_b["headers"])
    assert r.status_code == 404

    r = await client.get(f"/api/v1/orders/track/{order['order_number']}", headers=buyer_b["headers"])
    assert r.status_code == 404

    # Owner sees their order; customer list only shows own orders
    r = await client.get(f"/api/v1/orders/{order['id']}", headers=buyer_a["headers"])
    assert r.status_code == 200
    listing = (await client.get("/api/v1/orders", headers=buyer_b["headers"])).json()
    assert all(o["id"] != order["id"] for o in listing["items"])


async def test_saved_address_usable_at_checkout(client):
    buyer = await register_and_login(client, 999010)
    r = await client.post("/api/v1/addresses", headers=buyer["headers"], json=ADDRESS)
    assert r.status_code == 201
    address_id = r.json()["id"]

    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer, products["items"][0]["id"], 1)
    r = await _checkout(client, buyer, address_id=address_id)
    assert r.status_code == 201
    assert r.json()["order"]["shipping_address"]["city"] == "Bengaluru"
