"""
verify/orders/verify_orders.py

Comprehensive verification suite for the EMIVO Orders module.
Verifies full CRUD, price resolution, state transitions, idempotency,
and RLS tenant isolation against real Supabase infrastructure.

Usage:
    python verify/orders/verify_orders.py
"""
import sys
import time
import requests
import asyncio
import os
import uuid
import jwt
from pathlib import Path
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(r'd:\Projects\EMIVO\.env')

BASE_URL = "http://127.0.0.1:8000/api/v1"

passed_checks = 0
failed_checks = 0
failures = []


def assert_check(condition: bool, description: str, detail: str = ""):
    global passed_checks, failed_checks, failures
    if condition:
        passed_checks += 1
        print(f"  [PASS] {description}")
    else:
        failed_checks += 1
        err_msg = f"{description} | Detail: {detail}" if detail else description
        failures.append(err_msg)
        print(f"  [FAIL] {description}")
        if detail:
            print(f"         Detail: {detail}")


def register_and_login(email: str, password: str) -> tuple[str, str]:
    """Register a user and return (access_token, user_id)."""
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "first_name": "Test",
        "last_name": "User"
    })
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if resp.status_code != 200:
        print(f"Login failed for {email}: {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    me = requests.get(f"{BASE_URL}/users/me", headers={"Authorization": f"Bearer {token}"})
    return token, me.json()["id"]


async def setup_business_and_owner(user_id: str, business_slug: str) -> str:
    """Insert a business and make user an owner. Returns business_id."""
    db_url = os.environ.get('DATABASE_URL', '')
    engine = create_async_engine(db_url)
    business_id = str(uuid.uuid4())
    member_id = str(uuid.uuid4())
    async with engine.begin() as conn:
        await conn.execute(text(f"""
            INSERT INTO businesses (id, name, slug, is_active, settings, contact_email)
            VALUES ('{business_id}', 'Test Biz {business_slug}', '{business_slug}-{int(time.time())}',
                    true, '{{}}'::jsonb, 'biz@{business_slug}.com')
            ON CONFLICT DO NOTHING
        """))
        await conn.execute(text(f"""
            INSERT INTO business_members (id, user_id, business_id, role)
            VALUES ('{member_id}', '{user_id}', '{business_id}', 'owner')
            ON CONFLICT DO NOTHING
        """))
    await engine.dispose()
    return business_id


def relogin(email: str, password: str) -> tuple[str, dict]:
    """Re-login to get updated token with roles."""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    token = resp.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})
    return token, decoded


def main():
    global passed_checks, failed_checks, failures
    print("=" * 60)
    print("  EMIVO Orders Module — Verification Suite")
    print("=" * 60)

    ts = int(time.time())
    pwd = "Password123!"

    # ------------------------------------------------------------------
    # Setup: Business A Owner
    # ------------------------------------------------------------------
    print("\n[Setup: Business A Owner]")
    email_a = f"ord_biz_a_{ts}@example.com"
    token_a_init, user_id_a = register_and_login(email_a, pwd)
    biz_a_id = asyncio.run(setup_business_and_owner(user_id_a, f"biz-a-{ts}"))
    token_a, decoded_a = relogin(email_a, pwd)
    assert_check("owner" in decoded_a.get("roles", []), f"Business A token has owner role | {decoded_a.get('roles')}")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # ------------------------------------------------------------------
    # Setup: Business B Owner
    # ------------------------------------------------------------------
    print("\n[Setup: Business B Owner]")
    email_b = f"ord_biz_b_{ts}@example.com"
    token_b_init, user_id_b = register_and_login(email_b, pwd)
    biz_b_id = asyncio.run(setup_business_and_owner(user_id_b, f"biz-b-{ts}"))
    token_b, decoded_b = relogin(email_b, pwd)
    assert_check("owner" in decoded_b.get("roles", []), f"Business B token has owner role | {decoded_b.get('roles')}")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # ------------------------------------------------------------------
    # Setup Data in Business A: Customer & Product with Variant
    # ------------------------------------------------------------------
    print("\n[Setup Data in Business A]")
    cust_res = requests.post(f"{BASE_URL}/customers/", json={
        "name": "Order Customer",
        "email": f"cust_{ts}@example.com",
        "phone": "+1-555-0199",
        "address": "456 Commerce St"
    }, headers=headers_a)
    assert_check(cust_res.status_code == 201, "Create Customer in Business A (201)", cust_res.text)
    customer_id = cust_res.json()["id"]

    prod_res = requests.post(f"{BASE_URL}/products/", json={
        "name": "Gaming Laptop",
        "description": "High performance gaming laptop",
        "price": 120000,
        "sku": f"LAP-{ts}"
    }, headers=headers_a)
    assert_check(prod_res.status_code == 201, "Create Product in Business A (201)", prod_res.text)
    product_id = prod_res.json()["id"]

    var_res = requests.post(f"{BASE_URL}/products/{product_id}/variants", json={
        "name": "16GB RAM / 1TB SSD",
        "price": 135000,
        "sku": f"LAP-16GB-{ts}"
    }, headers=headers_a)
    assert_check(var_res.status_code == 201, "Add Variant to Product (201)", var_res.text)
    variant_id = var_res.json()["id"]

    # ------------------------------------------------------------------
    # 1. Create Order
    # ------------------------------------------------------------------
    print("\n[1. Create Order]")
    idempotency_key = f"idemp_{ts}"
    order_payload = {
        "customer_id": customer_id,
        "idempotency_key": idempotency_key,
        "shipping_address": {
            "name": "Order Customer",
            "street": "123 Shipping Way",
            "city": "Tech City",
            "state": "CA",
            "postal_code": "90210",
            "country": "US",
            "phone": "+1-555-0199"
        },
        "billing_address": {
            "name": "Order Customer",
            "street": "123 Billing Way",
            "city": "Tech City",
            "state": "CA",
            "postal_code": "90210",
            "country": "US"
        },
        "items": [
            {
                "product_id": product_id,
                "variant_id": variant_id,
                "quantity": 2
            }
        ],
        "notes": "Fragile — handle with care",
        "metadata_info": {"source": "web_storefront"}
    }

    create_res = requests.post(f"{BASE_URL}/orders/", json=order_payload, headers=headers_a)
    assert_check(create_res.status_code == 201, "Create order (201)", create_res.text)
    order_a = create_res.json()
    order_id = order_a.get("id")

    assert_check(order_a.get("status") == "PENDING", "Order status is PENDING")
    assert_check(order_a.get("customer_id") == customer_id, "Order customer_id matches")
    assert_check(order_a.get("notes") == "Fragile — handle with care", "Order notes match")
    assert_check(len(order_a.get("items", [])) == 1, "Order contains 1 item")

    # Verify line price: variant price (135000) * 2 = 270000
    item = order_a["items"][0]
    assert_check(item["unit_price"] == 135000, "Item unit_price resolved from variant (135000)")
    assert_check(item["subtotal"] == 270000, "Item subtotal correct (270000)")
    assert_check(order_a["total"] == 270000, "Order total correct (270000)")

    # ------------------------------------------------------------------
    # 2. Idempotency Key Re-submission
    # ------------------------------------------------------------------
    print("\n[2. Idempotency Key Re-submission]")
    re_create_res = requests.post(f"{BASE_URL}/orders/", json=order_payload, headers=headers_a)
    assert_check(re_create_res.status_code in (200, 201), "Re-submit idempotency key returns success", re_create_res.text)
    assert_check(re_create_res.json()["id"] == order_id, "Re-submit returns same order_id")

    # ------------------------------------------------------------------
    # 3. Get Order by ID
    # ------------------------------------------------------------------
    print("\n[3. Get Order by ID]")
    get_res = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers_a)
    assert_check(get_res.status_code == 200, "Get order (200)")
    assert_check(get_res.json()["id"] == order_id, "Get returns correct order")
    assert_check(len(get_res.json()["items"]) == 1, "Eager loaded items present")

    get_nonexistent = requests.get(f"{BASE_URL}/orders/00000000-0000-0000-0000-000000000000", headers=headers_a)
    assert_check(get_nonexistent.status_code == 404, "Get non-existent order returns 404")

    # ------------------------------------------------------------------
    # 4. List Orders with Filters & Pagination
    # ------------------------------------------------------------------
    print("\n[4. List Orders with Filters & Pagination]")
    list_res = requests.get(f"{BASE_URL}/orders/?page=1&page_size=10", headers=headers_a)
    assert_check(list_res.status_code == 200, "List orders (200)")
    list_data = list_res.json()
    assert_check("items" in list_data, "List response contains items")
    assert_check(list_data["total"] >= 1, "Total count >= 1")

    # Filter by status
    status_res = requests.get(f"{BASE_URL}/orders/?status=PENDING", headers=headers_a)
    assert_check(status_res.status_code == 200, "Filter by status=PENDING (200)")
    assert_check(all(o["status"] == "PENDING" for o in status_res.json()["items"]), "All returned orders have PENDING status")

    # Filter by customer_id
    cust_filter_res = requests.get(f"{BASE_URL}/orders/?customer_id={customer_id}", headers=headers_a)
    assert_check(cust_filter_res.status_code == 200, "Filter by customer_id (200)")
    assert_check(all(o["customer_id"] == customer_id for o in cust_filter_res.json()["items"]), "All returned orders match customer_id")

    # ------------------------------------------------------------------
    # 5. Order Status Transitions
    # ------------------------------------------------------------------
    print("\n[5. Order Status Transitions]")

    # Valid transition: PENDING -> CONFIRMED
    t1 = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={
        "status": "CONFIRMED",
        "reason": "Payment received"
    }, headers=headers_a)
    assert_check(t1.status_code == 200, "PENDING -> CONFIRMED transition (200)", t1.text)
    assert_check(t1.json()["status"] == "CONFIRMED", "Status updated to CONFIRMED")

    # Valid transition: CONFIRMED -> PROCESSING
    t2 = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={
        "status": "PROCESSING",
        "reason": "Sent to warehouse"
    }, headers=headers_a)
    assert_check(t2.status_code == 200, "CONFIRMED -> PROCESSING transition (200)", t2.text)
    assert_check(t2.json()["status"] == "PROCESSING", "Status updated to PROCESSING")

    # Invalid transition: PROCESSING -> PENDING (not allowed)
    t_invalid = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={
        "status": "PENDING"
    }, headers=headers_a)
    assert_check(t_invalid.status_code == 400, "Invalid transition PROCESSING -> PENDING rejected (400)", t_invalid.text)

    # ------------------------------------------------------------------
    # 6. RLS Tenant Isolation Test
    # ------------------------------------------------------------------
    print("\n[6. RLS Tenant Isolation Test]")
    # Business B attempts to read Business A's order
    cross_get = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers_b)
    assert_check(cross_get.status_code in (403, 404), "Business B CANNOT access Business A order (404/403)", cross_get.text)

    # Business B creates its own order
    prod_b_res = requests.post(f"{BASE_URL}/products/", json={
        "name": "Business B Gadget",
        "price": 5000,
        "sku": f"GAD-{ts}"
    }, headers=headers_b)
    assert_check(prod_b_res.status_code == 201, "Business B creates product (201)")
    prod_b_id = prod_b_res.json()["id"]

    order_b_res = requests.post(f"{BASE_URL}/orders/", json={
        "items": [{"product_id": prod_b_id, "quantity": 1}]
    }, headers=headers_b)
    assert_check(order_b_res.status_code == 201, "Business B creates order (201)")
    order_b_id = order_b_res.json()["id"]

    # Business A listing should not contain Business B's order
    list_a = requests.get(f"{BASE_URL}/orders/", headers=headers_a)
    a_order_ids = [o["id"] for o in list_a.json()["items"]]
    assert_check(order_b_id not in a_order_ids, "Business A order list does NOT contain Business B order")

    # ------------------------------------------------------------------
    # 7. Soft Delete / Cancel Order
    # ------------------------------------------------------------------
    print("\n[7. Soft Delete / Cancel Order]")
    del_res = requests.delete(f"{BASE_URL}/orders/{order_id}", headers=headers_a)
    assert_check(del_res.status_code == 204, "Soft delete order (204)", del_res.text)

    # Post-delete GET returns 404
    get_del = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers_a)
    assert_check(get_del.status_code == 404, "Deleted order returns 404")

    # Post-delete list does not contain order_id
    list_after_del = requests.get(f"{BASE_URL}/orders/", headers=headers_a)
    active_ids = [o["id"] for o in list_after_del.json()["items"]]
    assert_check(order_id not in active_ids, "Deleted order absent from active list")

    # ------------------------------------------------------------------
    # 8. Unauthorized Access
    # ------------------------------------------------------------------
    print("\n[8. Unauthorized Access]")
    no_auth = requests.get(f"{BASE_URL}/orders/")
    assert_check(no_auth.status_code in (401, 403), "No auth token returns 401/403")

    bad_auth = requests.get(f"{BASE_URL}/orders/", headers={"Authorization": "Bearer invalid_token"})
    assert_check(bad_auth.status_code in (401, 403), "Invalid token returns 401/403")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print(f"  Results: {passed_checks} passed, {failed_checks} failed out of {passed_checks + failed_checks} checks")
    print("=" * 60)

    if failed_checks > 0:
        print("\n  FAILED CHECKS:")
        for f in failures:
            print(f"    - {f}")
        sys.exit(1)
    else:
        print("\n  ALL ORDERS TESTS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
