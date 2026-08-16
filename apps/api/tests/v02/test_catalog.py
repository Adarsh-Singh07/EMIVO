"""Storefront catalog: scoping, filters, search, detail, effective pricing,
categories, related products."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from conftest import get_store_products

pytestmark = pytest.mark.asyncio


async def test_catalog_lists_only_store_products(client):
    data = await get_store_products(client, page_size=50)
    assert data["total"] >= 20
    for item in data["items"]:
        assert item["status"] == "ACTIVE"
        assert item["effective_price"] > 0
        assert item["mrp"] and item["mrp"] >= item["effective_price"]


async def test_category_filter(client):
    data = await get_store_products(client, category="audio")
    assert data["total"] > 0
    assert all(i["category_slug"] in ("wireless-earbuds", "audio") for i in data["items"])


async def test_price_filters_sort_and_search(client):
    data = await get_store_products(client, min_price=100000, max_price=400000, sort="price_asc")
    assert all(100000 <= i["effective_price"] <= 400000 for i in data["items"])
    prices = [i["effective_price"] for i in data["items"]]
    assert prices == sorted(prices)

    sugg = await client.get("/api/v1/store/products/search", params={"q": "earbuds"})
    assert sugg.status_code == 200
    assert any("earbuds" in s["name"].lower() for s in sugg.json())
    assert all(s["effective_price"] > 0 for s in sugg.json())


async def test_product_detail_and_related(client):
    listing = await get_store_products(client)
    slug = listing["items"][0]["slug"]
    r = await client.get(f"/api/v1/store/products/{slug}")
    assert r.status_code == 200
    detail = r.json()
    assert detail["slug"] == slug
    assert detail["stock"] is not None
    assert isinstance(detail["images"], list) and detail["images"]

    r2 = await client.get(f"/api/v1/store/products/{slug}/related")
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)


async def test_effective_price_matches_sql_and_python(client):
    """The SQL catalog expression and the Python pricing helper must agree."""
    from modules.orders.pricing import effective_price
    from sqlalchemy import text
    from core.database import async_session_maker
    from modules.products.repository import ProductRepository

    listing = await get_store_products(client, page_size=50)
    async with async_session_maker() as s:
        repo = ProductRepository(s)
        for item in listing["items"]:
            product = await repo.get_by_id(item["id"])
            assert effective_price(product) == item["effective_price"], item["name"]


async def test_festival_offer_activates_in_window(client, admin):
    """A sale_price inside its window becomes the effective price."""
    listing = await get_store_products(client)
    product = listing["items"][0]
    now = datetime.now(timezone.utc)
    payload = {
        "sale_price": max(product["price"] - 10000, 100),
        "offer_starts_at": (now - timedelta(minutes=1)).isoformat(),
        "offer_ends_at": (now + timedelta(days=5)).isoformat(),
    }
    r = await client.put(f"/api/v1/products/{product['id']}", headers=admin, json=payload)
    assert r.status_code == 200, r.text

    r2 = await client.get(f"/api/v1/store/products/{product['slug']}")
    detail = r2.json()
    assert detail["effective_price"] == payload["sale_price"]
    assert detail["on_offer"] is True
    assert detail["discount_percent"] > 0

    # Cleanup: remove the offer
    await client.put(f"/api/v1/products/{product['id']}", headers=admin, json={
        "sale_price": None, "offer_starts_at": None, "offer_ends_at": None,
    })


async def test_categories_tree(client):
    r = await client.get("/api/v1/store/categories")
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) >= 5
    assert any(c["slug"] == "audio" for c in cats)
    for c in cats:
        if c["slug"] == "audio":
            assert any(ch["slug"] == "wireless-earbuds" for ch in c["children"])
