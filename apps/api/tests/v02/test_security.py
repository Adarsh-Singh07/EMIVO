import pytest
from httpx import AsyncClient
from conftest import get_store_products

pytestmark = pytest.mark.asyncio

async def get_in_stock_product_id(client: AsyncClient):
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["stock"]["available"] >= 3)
    return product["id"]

async def test_price_tampering_ignored(client: AsyncClient, buyer: dict):
    product_id = await get_in_stock_product_id(client)
    headers = buyer["headers"]
    
    payload = {
        "items": [
            {"product_id": product_id, "quantity": 1}
        ],
        "shipping_address": {
            "full_name": "Test User",
            "line1": "123 Test St", "city": "Test", 
            "state": "TS", "pincode": "841508", "country": "IN", "phone": "9876543210"
        },
        "payment_method": "COD",
        "subtotal": 1,
        "total": 1
    }
    
    resp = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    
    assert data["order"]["total"] > 1

async def test_quantity_manipulation_rejected(client: AsyncClient, buyer: dict):
    product_id = await get_in_stock_product_id(client)
    headers = buyer["headers"]
    
    payload = {
        "items": [
            {"product_id": product_id, "quantity": -1}
        ],
        "shipping_address": {
            "full_name": "Test User",
            "line1": "123 Test St", "city": "Test", 
            "state": "TS", "pincode": "841508", "country": "IN", "phone": "9876543210"
        },
        "payment_method": "COD"
    }
    
    resp = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
    assert resp.status_code in (422, 400), resp.text

async def test_idor_order_access_rejected(client: AsyncClient, buyer: dict):
    order_id = "00000000-0000-0000-0000-000000000000"
    headers = buyer["headers"]
    
    resp = await client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert resp.status_code == 404

async def test_webhook_forgery_rejected(client: AsyncClient):
    payload = {
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {"payment": {"payment_amount": 100.0, "cf_payment_id": "123"}}
    }
    headers = {
        "x-webhook-signature": "invalid_signature",
        "x-webhook-timestamp": "1234567890"
    }
    resp = await client.post("/api/v1/payments/webhook/cashfree", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "signature" in resp.text.lower()
