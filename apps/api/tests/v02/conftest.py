"""Integration test fixtures — full HTTP stack (httpx ASGI) against the real
Postgres (RLS on) + Redis test containers, seeded with the store fixture data.

Environment (set by scripts/run_backend_tests.sh):
  DATABASE_URL, SYNC_DATABASE_URL, REDIS_URL  -> test containers
  ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD        -> seeded owner account
"""
import os
import sys
import uuid

import httpx
import pytest
import pytest_asyncio

sys.path.insert(0, "/app/apps/api")

from main import app as fastapi_app  # noqa: E402

RUN_ID = uuid.uuid4().hex[:8]
BASE = "http://testserver"


@pytest_asyncio.fixture(scope="session")
async def client():
    transport = httpx.ASGITransport(app=fastapi_app)
    async with fastapi_app.router.lifespan_context(fastapi_app):
        async with httpx.AsyncClient(transport=transport, base_url=BASE) as c:
            yield c


def _run(n: int = 0) -> str:
    return f"{RUN_ID}{n}"


async def register_and_login(client: httpx.AsyncClient, n: int = 0, password: str = "Passw0rd!123"):
    email = f"buyer{_run(n)}@example.com"
    r = await client.post("/api/v1/auth/register", json={
        "email": email, "password": password,
        "first_name": "Test", "last_name": f"Buyer{n}",
    })
    assert r.status_code == 201, r.text
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    tokens = r.json()
    return {
        "email": email,
        "password": password,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "headers": {"Authorization": f"Bearer {tokens['access_token']}"},
    }


async def admin_login(client: httpx.AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": os.environ.get("ADMIN_EMAIL", "admin@example.com"),
        "password": os.environ.get("ADMIN_INITIAL_PASSWORD", "TestAdminPass123!"),
    })
    assert r.status_code == 200, r.text
    tokens = r.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest_asyncio.fixture(scope="session")
async def admin(client):
    return await admin_login(client)


@pytest_asyncio.fixture
async def buyer(client):
    return await register_and_login(client, uuid.uuid4().int % 100000)


async def get_store_products(client: httpx.AsyncClient, **params) -> dict:
    r = await client.get("/api/v1/store/products", params=params)
    assert r.status_code == 200, r.text
    return r.json()


async def add_to_cart(client: httpx.AsyncClient, buyer: dict, product_id: str, qty: int = 1):
    r = await client.get("/api/v1/carts", headers=buyer["headers"])
    assert r.status_code == 200, r.text
    cart_id = r.json()["id"]
    r = await client.post(f"/api/v1/carts/{cart_id}/items", headers=buyer["headers"],
                          json={"product_id": product_id, "quantity": qty})
    assert r.status_code == 201, r.text
    return cart_id


ADDRESS = {
    "full_name": "Test Buyer",
    "phone": "9876543210",
    "line1": "221B Test Street",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560001",
}
