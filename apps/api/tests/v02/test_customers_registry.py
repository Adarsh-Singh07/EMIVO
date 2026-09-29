"""Customers registry (mounted router): every registered user is a customer,
CRM fields join by email, search works, and customer tokens are rejected."""
import pytest

from conftest import register_and_login

pytestmark = pytest.mark.asyncio

LIST = "/api/v1/customers/"


async def _staff_headers(client):
    from conftest import admin_login
    return await admin_login(client)


async def _uid(client, user) -> str:
    me = (await client.get("/api/v1/users/me", headers=user["headers"])).json()
    return me["id"]


async def test_customer_token_cannot_list(client):
    user = await register_and_login(client, 910020)
    r = await client.get(LIST, headers=user["headers"])
    assert r.status_code == 403, r.text


async def test_registry_lists_registered_users_realtime(client):
    staff = await _staff_headers(client)
    user = await register_and_login(client, 910021)
    uid = await _uid(client, user)

    r = await client.get(LIST, headers=staff, params={"page": 1, "page_size": 100})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["has_next"] is False and body["has_prev"] is False
    me = next((c for c in body["items"] if c["id"] == uid), None)
    assert me is not None, "registered user missing from customers registry"
    assert me["email"] == user["email"]
    assert me["name"].strip()
    assert me["suspended"] is False


async def test_registry_search_by_email_fragment(client):
    staff = await _staff_headers(client)
    user = await register_and_login(client, 910022)

    r = await client.get(LIST, headers=staff, params={"search": user["email"][:12]})
    assert r.status_code == 200, r.text
    emails = [c["email"] for c in r.json()["items"]]
    assert user["email"] in emails


async def test_get_and_crm_upsert_by_user_id(client):
    staff = await _staff_headers(client)
    user = await register_and_login(client, 910023)
    uid = await _uid(client, user)

    # Detail resolves by USER id even with no CRM row
    r = await client.get(f"/api/v1/customers/{uid}", headers=staff)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == uid
    assert r.json()["notes"] is None

    # PUT creates the CRM record keyed by email...
    r = await client.put(f"/api/v1/customers/{uid}", headers=staff, json={
        "notes": "VIP — repeat buyer", "address": "12 Mall Road, Gopalganj",
    })
    assert r.status_code == 200, r.text
    assert r.json()["notes"] == "VIP — repeat buyer"

    # ...and the list now surfaces the CRM fields
    r = await client.get(LIST, headers=staff, params={"search": user["email"]})
    assert r.json()["items"][0]["notes"] == "VIP — repeat buyer"
    assert r.json()["items"][0]["customer_id"]

    # Email (the identity join) is immutable through this endpoint
    r = await client.put(f"/api/v1/customers/{uid}", headers=staff, json={
        "email": "changed@example.com",
    })
    assert r.status_code == 422
    assert r.json()["code"] == "EMAIL_IMMUTABLE"
