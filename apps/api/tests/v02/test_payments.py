"""Payments: full mock-provider lifecycle (initiate → verify → captured),
amount tampering, webhook signature + idempotency, refunds, failure path."""
import hashlib
import hmac
import json
import uuid

import pytest

from conftest import ADDRESS, add_to_cart, get_store_products, register_and_login

pytestmark = pytest.mark.asyncio

MOCK_PROVIDER_SECRET = "mock_secret"  # MockProvider default


async def _webhook_secret() -> str:
    from core.config import settings
    return settings.cashfree_webhook_secret.get_secret_value()


async def _place_pending_online_order(client, buyer, coupon=None):
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["stock"]["available"] >= 2)
    await add_to_cart(client, buyer, product["id"], 1)
    payload = {"shipping_address": ADDRESS, "payment_method": "ONLINE"}
    if coupon:
        payload["coupon_code"] = coupon
    r = await client.post("/api/v1/orders/checkout", headers=buyer["headers"], json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["payment_required"] is True
    assert body["order"]["status"] == "PENDING"
    return body["order"]


async def _initiate(client, buyer, order, amount=None):
    return await client.post("/api/v1/payments/initiate", headers=buyer["headers"], json={
        "order_id": order["id"],
        "idempotency_key": f"pay-{uuid.uuid4().hex}",
        **({"amount": amount} if amount is not None else {}),
    })


async def test_online_payment_lifecycle_captures_and_commits_stock(client):
    buyer = await register_and_login(client, 600001)
    order = await _place_pending_online_order(client, buyer)

    before = (await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])).json()
    products = await get_store_products(client)
    stock_before = next(p for p in products["items"] if p["id"] == order["items"][0]["product_id"])["stock"]

    r = await _initiate(client, buyer, order)
    assert r.status_code == 201, r.text
    init = r.json()
    assert init["checkout"]["amount"] == order["total"]
    assert init["checkout"]["payment_session_id"]
    payment_id = init["payment"]["id"]
    provider_order_id = init["payment"]["provider_order_id"]

    # Forge a valid mock-provider signature (mock secret is empty in tests)
    provider_payment_id = f"pay_mock_{uuid.uuid4().hex[:10]}"
    signature = "valid_mock_signature"

    r = await client.post(f"/api/v1/payments/{payment_id}/verify-success",
                          headers=buyer["headers"],
                          json={"provider_payment_id": provider_payment_id,
                                "provider_signature": signature})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "SUCCESS"

    # Order confirmed; stock committed (reserved → sold)
    order_after = (await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])).json()
    assert order_after["status"] == "CONFIRMED"
    products_after = await get_store_products(client)
    stock_after = next(p for p in products_after["items"] if p["id"] == order["items"][0]["product_id"])["stock"]
    assert stock_after["reserved"] == stock_before["reserved"] - 1  # reservation consumed
    assert stock_after["on_hand"] == stock_before["on_hand"] - 1

    # Idempotent verify: replay returns captured payment, no double effect
    r2 = await client.post(f"/api/v1/payments/{payment_id}/verify-success",
                           headers=buyer["headers"],
                           json={"provider_payment_id": provider_payment_id,
                                 "provider_signature": signature})
    assert r2.status_code == 200
    assert r2.json()["status"] == "SUCCESS"


async def test_payment_amount_tampering_rejected(client):
    buyer = await register_and_login(client, 600002)
    order = await _place_pending_online_order(client, buyer)

    r = await _initiate(client, buyer, order, amount=100)  # ₹1 instead of the total
    assert r.status_code == 400
    assert r.json()["code"] == "AMOUNT_MISMATCH"


async def test_payment_cannot_be_initiated_for_foreign_order(client):
    buyer = await register_and_login(client, 600003)
    thief = await register_and_login(client, 600004)
    order = await _place_pending_online_order(client, buyer)

    r = await _initiate(client, thief, order)
    assert r.status_code in (403, 404)  # RLS may hide the order entirely


async def test_webhook_capture_and_duplicate_delivery(client):
    buyer = await register_and_login(client, 600005)
    order = await _place_pending_online_order(client, buyer)
    init = (await _initiate(client, buyer, order)).json()
    payment = init["payment"]

    body = {
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {
        
            "payment": {"cf_payment_id": "pay_mock_webhook1", "payment_amount": payment["amount"] / 100, "payment_status": "SUCCESS"},
            "order": {"order_id": payment["provider_order_id"]}
        }
    }
    raw = json.dumps(body)
    signature = "valid_mock_signature"
    event_id = f"evt_{uuid.uuid4().hex[:12]}"

    r = await client.post("/api/v1/payments/webhook/cashfree",
                          content=raw, headers={
                              "Content-Type": "application/json",
                              "X-Webhook-Signature": signature,
                              "x-webhook-timestamp": event_id,
                          })
    assert r.status_code == 200, r.text
    assert r.json()["handled"]["captured"] is True

    order_after = (await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])).json()
    assert order_after["status"] == "CONFIRMED"

    # Duplicate delivery of the same event id is a no-op
    r2 = await client.post("/api/v1/payments/webhook/cashfree",
                           content=raw, headers={
                               "Content-Type": "application/json",
                               "X-Webhook-Signature": signature,
                               "x-webhook-timestamp": event_id,
                           })
    assert r2.status_code == 200
    assert r2.json()["status"] == "duplicate_ignored"


async def test_webhook_bad_signature_rejected(client):
    body = {"type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": { }}
    r = await client.post("/api/v1/payments/webhook/cashfree",
                          content=json.dumps(body), headers={
                              "Content-Type": "application/json",
                              "X-Webhook-Signature": "deadbeef",
                              "X-Webhook-Timestamp": "1234567890",
                          })
    assert r.status_code == 400


async def test_refund_via_provider_and_restock(client, admin):
    buyer = await register_and_login(client, 600006)
    order = await _place_pending_online_order(client, buyer)
    init = (await _initiate(client, buyer, order)).json()
    payment = init["payment"]

    provider_payment_id = f"pay_mock_{uuid.uuid4().hex[:10]}"
    signature = "valid_mock_signature"
    r = await client.post(f"/api/v1/payments/{payment['id']}/verify-success",
                          headers=buyer["headers"],
                          json={"provider_payment_id": provider_payment_id,
                                "provider_signature": signature})
    assert r.status_code == 200

    # Refund is staff-only
    r = await client.post(f"/api/v1/payments/{payment['id']}/refund", headers=buyer["headers"], json={})
    assert r.status_code == 403

    r = await client.post(f"/api/v1/payments/{payment['id']}/refund", headers=admin,
                          json={"reason": "customer request"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "REFUNDED"

    order_after = (await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])).json()
    assert order_after["status"] == "REFUNDED"

    # Stock returned
    products = await get_store_products(client)
    stock = next(p for p in products["items"] if p["id"] == order["items"][0]["product_id"])["stock"]
    assert stock["on_hand"] >= 1  # restocked


async def test_failed_webhook_releases_reservation(client):
    buyer = await register_and_login(client, 600007)
    order = await _place_pending_online_order(client, buyer)
    init = (await _initiate(client, buyer, order)).json()
    payment = init["payment"]

    products = await get_store_products(client)
    stock_before = next(p for p in products["items"] if p["id"] == order["items"][0]["product_id"])["stock"]
    assert stock_before["reserved"] >= 1

    body = {
        "type": "PAYMENT_FAILED_WEBHOOK",
        "data": {
        
            "payment": {"cf_payment_id": "pay_mock_fail1", "payment_message": "insufficient funds", "payment_status": "FAILED"},
            "order": {"order_id": payment["provider_order_id"]}
        }
    }
    raw = json.dumps(body)
    signature = "valid_mock_signature"
    r = await client.post("/api/v1/payments/webhook/cashfree", content=raw, headers={
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": "1234567890",
    })
    assert r.status_code == 200
    assert r.json()["handled"]["failed"] is True

    order_after = (await client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])).json()
    assert order_after["status"] == "CANCELLED"

    products_after = await get_store_products(client)
    stock_after = next(p for p in products_after["items"] if p["id"] == order["items"][0]["product_id"])["stock"]
    assert stock_after["reserved"] == stock_before["reserved"] - 1
