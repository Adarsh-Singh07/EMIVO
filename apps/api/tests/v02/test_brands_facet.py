"""Brands facet: admin CRUD, rename cascade, auto-association, category-scoped
storefront brands, and the category landing-page payload."""
import uuid

import pytest

from conftest import get_store_products

pytestmark = pytest.mark.asyncio


async def _mk_brand(client, admin, name):
    r = await client.post("/api/v1/products/brands", json={"name": name}, headers=admin)
    assert r.status_code in (200, 201), r.text
    return r.json()


async def test_brand_crud_and_rename_cascade(client, admin):
    tag = uuid.uuid4().hex[:6]
    from_name = f"RnFrom{tag}"
    to_name = f"RnTo{tag}"

    b = await _mk_brand(client, admin, from_name)
    assert b["name"] == from_name
    assert b["slug"] == from_name.lower()

    # list
    r = await client.get("/api/v1/products/brands", headers=admin)
    assert r.status_code == 200
    names = [x["name"] for x in r.json()]
    assert from_name in names

    # attach a product to the brand
    prods = await get_store_products(client, page_size=1)
    pid = prods["items"][0]["id"]
    r = await client.put(f"/api/v1/products/{pid}", json={"brand": from_name}, headers=admin)
    assert r.status_code == 200, r.text

    # rename cascades to product text
    r = await client.put(f"/api/v1/products/brands/{b['id']}", json={"name": to_name}, headers=admin)
    assert r.status_code == 200, r.text

    detail = await client.get(f"/api/v1/store/products/{pid}")
    assert detail.status_code == 200
    assert detail.json()["brand"] == to_name

    # in-use brand cannot be deleted
    r = await client.delete(f"/api/v1/products/brands/{b['id']}", headers=admin)
    assert r.status_code == 409

    # free up + delete
    r = await client.put(f"/api/v1/products/{pid}", json={"brand": ""}, headers=admin)
    assert r.status_code == 200, r.text
    r = await client.delete(f"/api/v1/products/brands/{b['id']}", headers=admin)
    assert r.status_code == 204


async def test_brand_auto_associates_with_category(client, admin):
    tag = uuid.uuid4().hex[:6]
    brand = await _mk_brand(client, admin, f"AutoBrand{tag}")

    # brand + product in an existing category auto-creates the association
    prods = await get_store_products(client, page_size=1)
    item = prods["items"][0]
    r = await client.put(
        f"/api/v1/products/{item['id']}",
        json={"brand": brand["name"], "category_id": item["category_id"]},
        headers=admin,
    )
    assert r.status_code == 200, r.text

    # the category's scoped store brands include it
    r = await client.get("/api/v1/store/brands", params={"category": item["category_slug"]})
    assert r.status_code == 200
    names = [x["name"] for x in r.json()]
    assert brand["name"] in names
    row = next(x for x in r.json() if x["name"] == brand["name"])
    assert row["product_count"] >= 1


async def test_category_brands_association_endpoint(client, admin):
    tag = uuid.uuid4().hex[:6]
    b1 = await _mk_brand(client, admin, f"AssocA{tag}")
    b2 = await _mk_brand(client, admin, f"AssocB{tag}")

    # create a fresh category to associate on
    r = await client.post(
        "/api/v1/products/categories",
        json={"name": f"AssocCat{tag}", "slug": f"assoc-{tag}"},
        headers=admin,
    )
    assert r.status_code in (200, 201), r.text
    cid = r.json()["id"]

    r = await client.put(
        f"/api/v1/products/categories/{cid}/brands",
        json={"brand_ids": [b2["id"], b1["id"]]},  # order should be preserved
        headers=admin,
    )
    assert r.status_code == 200, r.text
    got = r.json()
    assert [x["id"] for x in got] == [b2["id"], b1["id"]]

    # cleanup
    r = await client.delete(f"/api/v1/products/categories/{cid}", headers=admin)
    assert r.status_code == 204


async def test_category_pages_payload(client):
    # 'mobiles' exists in the seed taxonomy
    r = await client.get("/api/v1/store/category-pages/mobiles")
    assert r.status_code == 200, r.text
    page = r.json()
    assert page["category"]["slug"] == "mobiles"
    assert isinstance(page["brands"], list)
    assert all("name" in b and "product_count" in b for b in page["brands"])
    assert isinstance(page["price_buckets"], list)
    # buckets have live counts and rupee labels
    for b in page["price_buckets"]:
        assert b["label"]
        assert b["product_count"] >= 0

    r = await client.get("/api/v1/store/category-pages/does-not-exist")
    assert r.status_code == 404


async def test_category_pages_override_via_store_settings(client, admin):
    # write an override, confirm it round-trips through /store/config
    r = await client.put(
        "/api/v1/admin/store-settings",
        json={
            "category_pages": {
                "mobiles": {
                    "hero_title": "Test Hero",
                    "price_buckets": [
                        {"label": "Under ₹5k", "min_price": None, "max_price": 500000}
                    ],
                }
            }
        },
        headers=admin,
    )
    assert r.status_code == 200, r.text
    assert (r.json().get("category_pages") or {}).get("mobiles", {}).get("hero_title") == "Test Hero"

    # public payload reflects the override
    r = await client.get("/api/v1/store/category-pages/mobiles")
    assert r.status_code == 200
    page = r.json()
    assert page["overrides"]["hero_title"] == "Test Hero"
    assert page["price_buckets"][0]["label"] == "Under ₹5k"
    assert page["price_buckets"][0]["max_price"] == 500000

    # reset so later tests/rows see clean defaults
    r = await client.put("/api/v1/admin/store-settings", json={"category_pages": {}}, headers=admin)
    assert r.status_code == 200
    assert not r.json().get("category_pages")
