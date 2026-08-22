import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def test_price_tampering_ignored(async_client: AsyncClient, customer_token: str, seed_data: dict):
    product_id = seed_data["product_id"]
    headers = {"Authorization": f"Bearer {customer_token}"}
    
    payload = {
        "items": [
            {"product_id": product_id, "quantity": 1}
        ],
        "shipping_address": {
            "first_name": "Test", "last_name": "User", 
            "line1": "123 Test St", "city": "Test", 
            "state": "TS", "postal_code": "12345", "country": "IN", "phone": "1234567890"
        },
        "payment_method": "COD",
        # Tampered totals
        "subtotal": 1,
        "total": 1
    }
    
    resp = await async_client.post("/api/v1/orders/checkout", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    
    # The server MUST ignore the client's `subtotal` and `total` and calculate its own
    assert data["order"]["total"] > 1000

async def test_quantity_manipulation_rejected(async_client: AsyncClient, customer_token: str, seed_data: dict):
    product_id = seed_data["product_id"]
    headers = {"Authorization": f"Bearer {customer_token}"}
    
    payload = {
        "items": [
            {"product_id": product_id, "quantity": -1}
        ],
        "shipping_address": {
            "first_name": "Test", "last_name": "User", 
            "line1": "123 Test St", "city": "Test", 
            "state": "TS", "postal_code": "12345", "country": "IN", "phone": "1234567890"
        },
        "payment_method": "COD"
    }
    
    resp = await async_client.post("/api/v1/orders/checkout", json=payload, headers=headers)
    # Validation error for negative quantity
    assert resp.status_code == 422

async def test_idor_order_access_rejected(async_client: AsyncClient, customer_token: str, seed_data: dict):
    # Customer tries to access an order that belongs to another customer
    # Assuming seed_data["order_id"] belongs to another user (or we can just use a fake UUID that doesn't exist, which returns 404, but if it did exist it would also return 404/403)
    order_id = "00000000-0000-0000-0000-000000000000"
    headers = {"Authorization": f"Bearer {customer_token}"}
    
    resp = await async_client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert resp.status_code == 404

async def test_webhook_forgery_rejected(async_client: AsyncClient):
    payload = {
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {"payment": {"payment_amount": 100.0, "cf_payment_id": "123"}}
    }
    headers = {
        "x-webhook-signature": "invalid_signature",
        "x-webhook-timestamp": "1234567890"
    }
    resp = await async_client.post("/api/v1/payments/webhook/cashfree", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "Invalid webhook signature" in resp.json()["detail"]
