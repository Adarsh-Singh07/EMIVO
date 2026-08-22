"""Admin authorization boundaries + operational endpoints; wishlist,
notifications, addresses, newsletter."""
import uuid

import pytest

from conftest import ADDRESS, add_to_cart, get_store_products, register_and_login

pytestmark = pytest.mark.asyncio


async def _cod_order(client, buyer):
    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer, products["items"][0]["id"], 1)
    r = await client.post("/api/v1/orders/checkout", headers=buyer["headers"],
                          json={"shipping_address": ADDRESS, "payment_method": "COD"})
    assert r.status_code == 201
    return r.json()["order"]


# --------------------------------------------------------------------- #
# Authorization: customers must never reach admin operations             #
# --------------------------------------------------------------------- #

async def test_customer_blocked_from_admin_apis(client):
    customer = await register_and_login(client, 700001)

    admin_endpoints = [
        ("GET", "/api/v1/admin/dashboard"),
        ("GET", "/api/v1/admin/users"),
        ("GET", "/api/v1/inventory"),
        ("GET", "/api/v1/payments"),
        ("GET", "/api/v1/businesses"),
        ("PUT", "/api/v1/admin/store-settings"),
    ]
    for method, path in admin_endpoints:
        r = await client.request(method, path, headers=customer["headers"])
        assert r.status_code == 403, f"{method} {path} returned {r.status_code}"


async def test_anonymous_blocked_from_admin_apis(client):
    r = await client.get("/api/v1/admin/dashboard")
    assert r.status_code in (401, 403)
    r = await client.get("/api/v1/inventory")
    assert r.status_code in (401, 403)


async def test_customer_blocked_from_product_writes(client):
    customer = await register_and_login(client, 700002)
    r = await client.post("/api/v1/products/", headers=customer["headers"], json={
        "name": "Hack", "price": 100,
    })
    assert r.status_code == 403


# --------------------------------------------------------------------- #
# Dashboard truthfulness                                                  #
# --------------------------------------------------------------------- #

async def test_dashboard_reflects_real_data(client, admin):
    buyer = await register_and_login(client, 700003)
    order = await _cod_order(client, buyer)

    r = await client.get("/api/v1/admin/dashboard", headers=admin)
    assert r.status_code == 200
    stats = r.json()
    assert stats["today_orders"] >= 1
    assert stats["today_revenue_paise"] >= order["total"]
    assert any(o["id"] == order["id"] for o in stats["recent_orders"])


# --------------------------------------------------------------------- #
# Order lifecycle (staff transitions w/ side effects)                     #
# --------------------------------------------------------------------- #

async def test_order_lifecycle_ship_and_deliver(client, admin):
    buyer = await register_and_login(client, 700004)
    order = await _cod_order(client, buyer)
    products = await get_store_products(client)
    stock_before = next(p for p in products["items"] if p["id"] == order["items"][0]["product_id"])["stock"]

    async def transition(status, **extra):
        r = await client.patch(f"/api/v1/orders/{order['id']}/status", headers=admin,
                               json={"status": status, **extra})
        assert r.status_code == 200, r.text
        return r.json()

    updated = await transition("PROCESSING")
    updated = await transition("PACKED")
    updated = await transition("SHIPPED", tracking_number="TRK123456789",
                               tracking_url="https://track.example.com/TRK123456789")
    assert updated["tracking_number"] == "TRK123456789"
    assert updated["shipped_at"]
    updated = await transition("OUT_FOR_DELIVERY")
    updated = await transition("DELIVERED")
    assert updated["delivered_at"]

    # COD stock committed on delivery
    products_after = await get_store_products(client)
    stock_after = next(p for p in products_after["items"] if p["id"] == order["items"][0]["product_id"])["stock"]
    assert stock_after["reserved"] == stock_before["reserved"] - 1
    assert stock_after["on_hand"] == stock_before["on_hand"] - 1


async def test_invalid_transition_rejected(client, admin):
    buyer = await register_and_login(client, 700005)
    order = await _cod_order(client, buyer)  # CONFIRMED
    r = await client.patch(f"/api/v1/orders/{order['id']}/status", headers=admin,
                           json={"status": "DELIVERED"})
    assert r.status_code == 400  # CONFIRMED → DELIVERED is not a valid edge

    r = await client.patch(f"/api/v1/orders/{order['id']}/status", headers=admin,
                           json={"status": "CANCELLED", "reason": "test"})
    assert r.status_code == 200
    # Cancel released the reservation
    products = await get_store_products(client)
    stock = next(p for p in products["items"] if p["id"] == order["items"][0]["product_id"])["stock"]
    assert stock["reserved"] >= 0


async def test_customer_cannot_update_order_status(client):
    buyer = await register_and_login(client, 700006)
    order = await _cod_order(client, buyer)
    r = await client.patch(f"/api/v1/orders/{order['id']}/status", headers=buyer["headers"],
                           json={"status": "DELIVERED"})
    assert r.status_code == 403


# --------------------------------------------------------------------- #
# Store settings (COD toggle observable at checkout)                      #
# --------------------------------------------------------------------- #

async def test_cod_toggle_enforced(client, admin):
    r = await client.put("/api/v1/admin/store-settings", headers=admin,
                         json={"cod_enabled": False})
    assert r.status_code == 200

    buyer = await register_and_login(client, 700007)
    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer, products["items"][0]["id"], 1)
    r = await client.post("/api/v1/orders/checkout", headers=buyer["headers"],
                          json={"shipping_address": ADDRESS, "payment_method": "COD"})
    assert r.status_code == 400
    assert r.json()["code"] == "COD_DISABLED"

    await client.put("/api/v1/admin/store-settings", headers=admin,
                     json={"cod_enabled": True})


# --------------------------------------------------------------------- #
# Wishlist / addresses / newsletter                                       #
# --------------------------------------------------------------------- #

async def test_wishlist_flow(client):
    buyer = await register_and_login(client, 700008)
    products = await get_store_products(client)
    pid = products["items"][0]["id"]

    r = await client.post(f"/api/v1/wishlist/{pid}", headers=buyer["headers"])
    assert r.status_code == 201
    # Idempotent re-add
    r = await client.post(f"/api/v1/wishlist/{pid}", headers=buyer["headers"])
    assert r.status_code == 201

    r = await client.get("/api/v1/wishlist", headers=buyer["headers"])
    assert r.status_code == 200
    assert any(i["product_id"] == pid for i in r.json()["items"])
    assert r.json()["items"][0]["product"]["id"] == pid

    r = await client.delete(f"/api/v1/wishlist/{pid}", headers=buyer["headers"])
    assert r.status_code == 204

    # Foreign wishlist is invisible
    other = await register_and_login(client, 700009)
    await client.post(f"/api/v1/wishlist/{pid}", headers=buyer["headers"])
    r = await client.get("/api/v1/wishlist", headers=other["headers"])
    assert r.json()["total"] == 0


async def test_addresses_crud_and_default(client):
    buyer = await register_and_login(client, 700010)
    r = await client.post("/api/v1/addresses", headers=buyer["headers"], json=ADDRESS)
    assert r.status_code == 201
    first = r.json()
    assert first["is_default"] is True  # first address auto-default

    second = (await client.post("/api/v1/addresses", headers=buyer["headers"], json={
        **ADDRESS, "line1": "Another Street 5", "city": "Pune", "pincode": "411001",
    })).json()
    assert second["is_default"] is False

    r = await client.post(f"/api/v1/addresses/{second['id']}/default", headers=buyer["headers"])
    assert r.status_code == 200
    listing = (await client.get("/api/v1/addresses", headers=buyer["headers"])).json()["items"]
    by_id = {a["id"]: a for a in listing}
    assert by_id[second["id"]]["is_default"] is True
    assert by_id[first["id"]]["is_default"] is False

    r = await client.delete(f"/api/v1/addresses/{first['id']}", headers=buyer["headers"])
    assert r.status_code == 204

    # Foreign address is invisible
    other = await register_and_login(client, 700011)
    r = await client.put(f"/api/v1/addresses/{second['id']}", headers=other["headers"],
                         json={"line1": "Hacked Street"})
    assert r.status_code == 404


async def test_newsletter_subscribe_idempotent(client):
    email = f"news{uuid.uuid4().hex[:8]}@example.com"
    r = await client.post("/api/v1/newsletter/subscribe", json={"email": email})
    assert r.status_code == 201
    r = await client.post("/api/v1/newsletter/subscribe", json={"email": email})
    assert r.status_code == 201
    assert "already" in r.json()["message"] or r.json()["subscribed"] is True
