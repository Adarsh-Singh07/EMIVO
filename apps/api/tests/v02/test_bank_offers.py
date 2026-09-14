"""Bank offers: public visibility rules, staff-only CRUD boundary,
eligibility join behaviour (unknown product ids dropped, empty = sitewide)."""
from datetime import datetime, timedelta, timezone

import pytest

from conftest import get_store_products

pytestmark = pytest.mark.asyncio

PUB = "/api/v1/store/bank-offers"
ADM = "/api/v1/admin/bank-offers"


def _payload(**overrides):
    # datetime fields must go over the wire as ISO strings (httpx json= is
    # stdlib json, which cannot serialize datetime objects).
    for key in ("starts_at", "ends_at"):
        if isinstance(overrides.get(key), datetime):
            overrides[key] = overrides[key].isoformat()
    base = {
        "bank_name": "HDFC Bank",
        "card_type": "CREDIT",
        "discount_text": "10% instant discount up to ₹1,500",
        "poster_url": None,
        "link": None,
        "starts_at": None,
        "ends_at": None,
        "position": 0,
        "is_active": True,
        "product_ids": [],
    }
    base.update(overrides)
    return base


async def _first_product_id(client):
    data = await get_store_products(client)
    return data["items"][0]["id"]


async def _cleanup(client, admin):
    r = await client.get(ADM, headers=admin)
    for o in r.json():
        await client.delete(f"{ADM}/{o['id']}", headers=admin)


async def test_public_listing_starts_empty(client):
    r = await client.get(PUB)
    assert r.status_code == 200
    assert r.json() == []


async def test_admin_endpoints_require_staff(client, buyer):
    r = await client.get(ADM)
    assert r.status_code == 401
    r = await client.get(ADM, headers=buyer["headers"])
    assert r.status_code == 403
    r = await client.post(ADM, headers=buyer["headers"], json=_payload())
    assert r.status_code == 403


async def test_admin_crud_roundtrip(client, admin):
    try:
        pid = await _first_product_id(client)

        r = await client.post(ADM, headers=admin, json=_payload(product_ids=[pid]))
        assert r.status_code == 201, r.text
        created = r.json()
        assert created["bank_name"] == "HDFC Bank"
        assert created["product_ids"] == [pid]

        # Admin list (unfiltered: includes inactive / out-of-window offers).
        r = await client.get(ADM, headers=admin)
        assert any(o["id"] == created["id"] for o in r.json())

        # Public listing shows the active, in-window offer — with product_ids
        # so the storefront can filter eligibility client-side.
        r = await client.get(PUB)
        pub = {o["id"]: o for o in r.json()}
        assert created["id"] in pub
        assert pub[created["id"]]["product_ids"] == [pid]

        # Full-replace update: new text, eligibility cleared → sitewide.
        r = await client.put(
            f"{ADM}/{created['id']}",
            headers=admin,
            json=_payload(discount_text="5% unlimited cashback", product_ids=[]),
        )
        assert r.status_code == 200, r.text
        assert r.json()["discount_text"] == "5% unlimited cashback"
        assert r.json()["product_ids"] == []

        r = await client.delete(f"{ADM}/{created['id']}", headers=admin)
        assert r.status_code == 200
        r = await client.get(ADM, headers=admin)
        assert all(o["id"] != created["id"] for o in r.json())
        r = await client.get(PUB)
        assert all(o["id"] != created["id"] for o in r.json())
    finally:
        await _cleanup(client, admin)


async def test_unknown_product_ids_are_dropped(client, admin):
    try:
        pid = await _first_product_id(client)
        r = await client.post(
            ADM,
            headers=admin,
            json=_payload(product_ids=["not-a-real-product-id", pid]),
        )
        assert r.status_code == 201, r.text
        # FK integrity: only the id that actually exists gets linked.
        assert r.json()["product_ids"] == [pid]
    finally:
        await _cleanup(client, admin)


async def test_public_visibility_filters(client, admin):
    now = datetime.now(timezone.utc)
    try:
        offers = {}
        for name, extra in [
            ("inactive", _payload(is_active=False)),
            ("future", _payload(starts_at=now + timedelta(hours=1))),
            ("expired", _payload(ends_at=now - timedelta(hours=1))),
            ("live", _payload(starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1))),
        ]:
            r = await client.post(ADM, headers=admin, json=extra)
            assert r.status_code == 201, r.text
            offers[name] = r.json()["id"]

        r = await client.get(PUB)
        visible = {o["id"] for o in r.json()}
        assert offers["live"] in visible
        assert offers["inactive"] not in visible
        assert offers["future"] not in visible
        assert offers["expired"] not in visible

        # Admin sees everything regardless of window.
        r = await client.get(ADM, headers=admin)
        admin_ids = {o["id"] for o in r.json()}
        assert set(offers.values()) <= admin_ids
    finally:
        await _cleanup(client, admin)


async def test_update_delete_unknown_id_404(client, admin):
    r = await client.put(f"{ADM}/does-not-exist", headers=admin, json=_payload())
    assert r.status_code == 404
    r = await client.delete(f"{ADM}/does-not-exist", headers=admin)
    assert r.status_code == 404
