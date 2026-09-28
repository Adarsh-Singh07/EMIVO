"""Admin moderation: suspend with reason, delete (anonymized, orders kept),
customer 360 overview, and self-service account deletion."""
import pytest

from conftest import _run, register_and_login

pytestmark = pytest.mark.asyncio


async def _admin_headers(client):
    from conftest import admin_login
    return await admin_login(client)


async def _uid(client, user) -> str:
    me = (await client.get("/api/v1/users/me", headers=user["headers"])).json()
    return me["id"]


async def test_suspend_unsuspend_and_login_message(client):
    admin = await _admin_headers(client)
    user = await register_and_login(client, 910001)

    r = await client.post(f"/api/v1/admin/users/{await _uid(client, user)}/suspend",
                          headers=admin, json={"reason": "Fraudulent order activity"})
    assert r.status_code == 200, r.text

    # Suspended login is blocked and shows the reason + support path
    r = await client.post("/api/v1/auth/login", json={
        "email": user["email"], "password": "Passw0rd!123"})
    assert r.status_code == 403
    body = r.json()
    assert body["code"] == "ACCOUNT_SUSPENDED"
    assert "Fraudulent order activity" in body["error"]
    assert "support@elektrix.in" in body["error"]

    # Unsuspend restores access
    r = await client.post(f"/api/v1/admin/users/{await _uid(client, user)}/unsuspend", headers=admin)
    assert r.status_code == 200
    r = await client.post("/api/v1/auth/login", json={
        "email": user["email"], "password": "Passw0rd!123"})
    assert r.status_code == 200


async def test_delete_user_anonymizes_but_keeps_history(client):
    from sqlalchemy import text
    from core.database import async_session_maker

    admin = await _admin_headers(client)
    user = await register_and_login(client, 910002)
    uid = await _uid(client, user)

    # Give the account one order so we can prove history survives deletion
    products = (await client.get("/api/v1/store/products", params={"in_stock": "true"})).json()
    pid = max(products["items"], key=lambda p: (p.get("stock") or {}).get("available", 0))["id"]
    cart = (await client.get("/api/v1/carts", headers=user["headers"])).json()
    r = await client.post(f"/api/v1/carts/{cart['id']}/items", headers=user["headers"],
                          json={"product_id": pid, "quantity": 1})
    assert r.status_code == 201, r.text
    r = await client.post("/api/v1/orders/checkout", headers=user["headers"],
                          json={"shipping_address": {
                              "full_name": "Del Me", "phone": "9876500001",
                              "line1": "1 Test Lane", "city": "Gopalganj",
                              "state": "Bihar", "pincode": "841508"},
                              "payment_method": "COD"})
    assert r.status_code == 201, r.text

    # Admin deletes the account (confirm happens in the UI, not the API)
    r = await client.delete(f"/api/v1/admin/users/{uid}", headers=admin)
    assert r.status_code == 204, r.text

    # Sign-in is dead, PII is gone
    r = await client.post("/api/v1/auth/login", json={
        "email": user["email"], "password": "Passw0rd!123"})
    assert r.status_code == 401
    async with async_session_maker() as s:
        row = (await s.execute(text(
            "SELECT email, first_name, is_active FROM users WHERE id = :u"), {"u": uid}
        )).mappings().first()
        assert row["first_name"] == "Deleted"
        assert row["email"].startswith("deleted-")
        assert row["is_active"] is False
        # Order history preserved and still linked
        n = (await s.execute(text(
            "SELECT count(*) FROM orders WHERE user_id = :u"), {"u": uid})).scalar()
        assert n >= 1


async def test_customer_overview_returns_orders_payments_addresses(client):
    admin = await _admin_headers(client)
    user = await register_and_login(client, 910003)
    r = await client.get(f"/api/v1/admin/customers/{await _uid(client, user)}/overview", headers=admin)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profile"]["email"] == user["email"]
    assert isinstance(body["orders"], list)
    assert isinstance(body["payments"], list)
    assert isinstance(body["addresses"], list)


async def test_self_service_account_deletion(client):
    user = await register_and_login(client, 910004)
    r = await client.delete("/api/v1/users/me", headers=user["headers"])
    assert r.status_code == 204, r.text
    r = await client.post("/api/v1/auth/login", json={
        "email": user["email"], "password": "Passw0rd!123"})
    assert r.status_code == 401
