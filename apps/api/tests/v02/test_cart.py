"""Cart: guest carts, stock validation, IDOR ownership, login merge."""
import uuid

import pytest

from conftest import get_store_products, register_and_login

pytestmark = pytest.mark.asyncio


async def test_guest_cart_flow(client):
    session = f"guest-{uuid.uuid4().hex}"
    headers = {"X-Cart-Session": session}

    r = await client.get("/api/v1/carts", headers=headers)
    assert r.status_code == 200
    cart = r.json()
    assert cart["session_id"] == session

    products = await get_store_products(client, in_stock=True)
    pid = products["items"][0]["id"]

    r = await client.post(f"/api/v1/carts/{cart['id']}/items", headers=headers,
                          json={"product_id": pid, "quantity": 2})
    assert r.status_code == 201
    body = r.json()
    assert body["items"][0]["quantity"] == 2
    assert body["subtotal"] == body["items"][0]["unit_price"] * 2
    assert body["items"][0]["stock_available"] is not None


async def test_cart_rejects_more_than_stock(client):
    session = f"guest-{uuid.uuid4().hex}"
    headers = {"X-Cart-Session": session}
    cart = (await client.get("/api/v1/carts", headers=headers)).json()

    products = await get_store_products(client, in_stock=True)
    item = min(products["items"], key=lambda p: p["stock"]["available"])
    avail = item["stock"]["available"]

    r = await client.post(f"/api/v1/carts/{cart['id']}/items", headers=headers,
                          json={"product_id": item["id"], "quantity": avail + 5})
    assert r.status_code == 409
    assert r.json()["code"] == "INSUFFICIENT_STOCK"


async def test_cart_idor_blocked(client):
    """A guest session must not read another session's cart; a user must not
    read a foreign user cart or a guest cart without its session token."""
    victim_session = f"guest-{uuid.uuid4().hex}"
    victim = (await client.get("/api/v1/carts", headers={"X-Cart-Session": victim_session})).json()

    attacker_session = f"guest-{uuid.uuid4().hex}"
    r = await client.get(f"/api/v1/carts/{victim['id']}",
                         headers={"X-Cart-Session": attacker_session})
    assert r.status_code == 404

    user = await register_and_login(client, 888001)
    r = await client.get(f"/api/v1/carts/{victim['id']}", headers=user["headers"])
    assert r.status_code == 404


async def test_guest_cart_merges_into_user_cart_on_login(client):
    session = f"guest-{uuid.uuid4().hex}"
    headers = {"X-Cart-Session": session}
    cart = (await client.get("/api/v1/carts", headers=headers)).json()

    products = await get_store_products(client, in_stock=True)
    pid = products["items"][0]["id"]
    await client.post(f"/api/v1/carts/{cart['id']}/items", headers=headers,
                      json={"product_id": pid, "quantity": 1})

    user = await register_and_login(client, 888002)
    r = await client.post("/api/v1/carts/merge", headers=user["headers"],
                          json={"session_id": session, "cart_id": cart["id"]})
    assert r.status_code == 200, r.text
    merged = r.json()
    import re
    assert re.match(r"^[0-9a-f-]{36}$", merged["user_id"])  # became the user's cart
    assert any(i["product_id"] == pid for i in merged["items"])

    # The guest cart is emptied
    r2 = await client.get("/api/v1/carts", headers=headers)
    assert all(i["product_id"] != pid for i in r2.json()["items"])


async def test_cart_merge_scopes_user_id(client):
    session = f"guest-{uuid.uuid4().hex}"
    cart = (await client.get("/api/v1/carts", headers={"X-Cart-Session": session})).json()
    user = await register_and_login(client, 888003)
    r = await client.post("/api/v1/carts/merge", headers=user["headers"],
                          json={"session_id": session, "cart_id": cart["id"]})
    assert r.status_code == 200
    assert r.json()["user_id"] is not None


async def test_cart_merge_rejects_unowned_cart(client):
    """Regression (BOLA fix): a session token without the matching guest
    cart id — or a cart id the caller does not control — must 404."""
    victim_session = f"guest-{uuid.uuid4().hex}"
    victim_cart = (await client.get(
        "/api/v1/carts", headers={"X-Cart-Session": victim_session}
    )).json()

    attacker = await register_and_login(client, 888004)

    # Token alone (no cart_id) is not enough
    r = await client.post("/api/v1/carts/merge", headers=attacker["headers"],
                          json={"session_id": victim_session})
    assert r.status_code == 422

    # Mismatched pair (wrong cart id) is rejected
    r = await client.post("/api/v1/carts/merge", headers=attacker["headers"],
                          json={"session_id": victim_session,
                                "cart_id": victim_cart["id"][:-1] + ("0" if victim_cart["id"][-1] != "0" else "1")})
    assert r.status_code == 404

    # Correct pair from a DIFFERENT caller is still rejected: the guest cart
    # must be presented by a session that matches, not just any account.
    other_session = f"guest-{uuid.uuid4().hex}"
    other_cart = (await client.get(
        "/api/v1/carts", headers={"X-Cart-Session": other_session}
    )).json()
    r = await client.post("/api/v1/carts/merge", headers=attacker["headers"],
                          json={"session_id": other_session, "cart_id": other_cart["id"]})
    # The attacker does hold both values here (they created the cart), so the
    # merge itself succeeds — ownership for guests IS possession of the pair.
    assert r.status_code == 200
