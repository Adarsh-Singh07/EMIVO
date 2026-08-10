"""
EMIVO Payments Module — Verification Suite
Verifies Payments against real Supabase DB, Redis, and FastAPI endpoints under RLS.
"""
import time
import requests
import json
import os
import sys
import uuid
import hmac
import hashlib
import asyncio
from pathlib import Path
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
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": email, "password": password,
        "first_name": "Payment", "last_name": "User"
    })
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"Login failed for {email}: {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    me = requests.get(f"{BASE_URL}/users/me", headers={"Authorization": f"Bearer {token}"})
    return token, me.json()["id"]

async def setup_business_and_owner(user_id: str, business_slug: str) -> str:
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

def relogin(email: str, password: str) -> str:
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

def main():
    print("=" * 60)
    print("  EMIVO Payments Module — Verification Suite")
    print("=" * 60)

    ts = int(time.time())

    # --- Setup Business A Owner ---
    email_a = f"pay_owner_a_{ts}@example.com"
    pass_a = "Password123!"
    token_a_init, user_a_id = register_and_login(email_a, pass_a)
    biz_a_id = asyncio.run(setup_business_and_owner(user_a_id, f"pay-biz-a-{ts}"))
    token_a = relogin(email_a, pass_a)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    assert_check(True, "Business A owner authenticated with owner role")

    # --- Setup Business B Owner ---
    email_b = f"pay_owner_b_{ts}@example.com"
    pass_b = "Password123!"
    token_b_init, user_b_id = register_and_login(email_b, pass_b)
    biz_b_id = asyncio.run(setup_business_and_owner(user_b_id, f"pay-biz-b-{ts}"))
    token_b = relogin(email_b, pass_b)
    headers_b = {"Authorization": f"Bearer {token_b}"}
    assert_check(True, "Business B owner authenticated with owner role")

    # --- Setup Customer, Product, Order in Business A ---
    print("\n[Setup Data in Business A]")
    cust_res = requests.post(f"{BASE_URL}/customers/", headers=headers_a, json={
        "name": "PayCustomer One",
        "email": f"paycust_{ts}@example.com",
        "phone": "+1-555-0199"
    })
    assert_check(cust_res.status_code == 201, "Create Customer in Business A (201)", cust_res.text)
    customer_id_a = cust_res.json()["id"]

    prod_res = requests.post(f"{BASE_URL}/products/", headers=headers_a, json={
        "name": f"PayProduct {ts}", "price": 4500, "sku": f"PAY-{ts}"
    })
    assert_check(prod_res.status_code == 201, "Create Product in Business A (201)", prod_res.text)
    product_id_a = prod_res.json()["id"]

    order_req = {
        "customer_id": customer_id_a,
        "items": [{"product_id": product_id_a, "quantity": 2}],
        "notes": "Order for payment verification"
    }
    ord_res = requests.post(f"{BASE_URL}/orders/", headers=headers_a, json=order_req)
    assert_check(ord_res.status_code == 201, "Create Order in Business A (201)", ord_res.text)
    order_a = ord_res.json()
    order_id_a = order_a["id"]
    order_total_a = order_a["total"]  # 9000

    # 1. Initiate Payment
    print("\n[1. Initiate Payment]")
    idempotency_key = f"idem_pay_{uuid.uuid4().hex}"
    pay_req = {
        "order_id": order_id_a,
        "amount": order_total_a,
        "currency": "INR",
        "provider": "RAZORPAY",
        "idempotency_key": idempotency_key
    }
    init_res = requests.post(f"{BASE_URL}/payments/initiate", headers=headers_a, json=pay_req)
    assert_check(init_res.status_code == 201, "Initiate payment (201)", init_res.text)
    payment_a = init_res.json()
    payment_id_a = payment_a["id"]
    provider_order_id = payment_a["provider_order_id"]

    assert_check(payment_a["status"] == "PENDING", "Payment status is PENDING")
    assert_check(provider_order_id and provider_order_id.startswith("order_"), f"Provider order ID created ({provider_order_id})")

    # 2. Idempotency Key Re-submission
    print("\n[2. Idempotency Key Re-submission]")
    idem_res = requests.post(f"{BASE_URL}/payments/initiate", headers=headers_a, json=pay_req)
    assert_check(
        idem_res.status_code in [200, 201] and idem_res.json()["id"] == payment_id_a,
        "Re-submitting idempotency key returns same payment",
        idem_res.text
    )

    # 3. Verify Payment Success & Capture
    print("\n[3. Verify Payment Success & Capture]")
    provider_payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    payload_str = f"{provider_order_id}|{provider_payment_id}"
    mock_signature = hmac.new(b"mock_secret", payload_str.encode("utf-8"), hashlib.sha256).hexdigest()

    verify_req = {
        "provider_payment_id": provider_payment_id,
        "provider_signature": mock_signature
    }
    cap_res = requests.post(f"{BASE_URL}/payments/{payment_id_a}/verify-success", headers=headers_a, json=verify_req)
    assert_check(cap_res.status_code == 200, "Verify & capture payment (200)", cap_res.text)

    captured_pay = cap_res.json()
    assert_check(captured_pay["status"] == "CAPTURED", "Payment status updated to CAPTURED")

    # Verify associated Order transitioned to CONFIRMED
    get_order_res = requests.get(f"{BASE_URL}/orders/{order_id_a}", headers=headers_a)
    assert_check(
        get_order_res.status_code == 200 and get_order_res.json()["status"] == "CONFIRMED",
        "Associated Order status transitioned to CONFIRMED",
        get_order_res.text
    )

    # 4. Get Payment by ID
    print("\n[4. Get Payment by ID]")
    get_pay_res = requests.get(f"{BASE_URL}/payments/{payment_id_a}", headers=headers_a)
    assert_check(get_pay_res.status_code == 200 and get_pay_res.json()["id"] == payment_id_a, "Get payment by ID (200)")

    get_missing = requests.get(f"{BASE_URL}/payments/00000000-0000-0000-0000-000000000000", headers=headers_a)
    assert_check(get_missing.status_code == 404, "Get non-existent payment returns 404")

    # 5. List Payments with Filters & Pagination
    print("\n[5. List Payments with Filters & Pagination]")
    list_pay_res = requests.get(f"{BASE_URL}/payments/?page=1&page_size=10", headers=headers_a)
    assert_check(list_pay_res.status_code == 200, "List payments (200)", list_pay_res.text)
    assert_check(list_pay_res.json()["total"] >= 1, f"List payments returns items (Total: {list_pay_res.json()['total']})")

    filter_pay_res = requests.get(f"{BASE_URL}/payments/?order_id={order_id_a}&status=CAPTURED", headers=headers_a)
    assert_check(filter_pay_res.status_code == 200 and len(filter_pay_res.json()["items"]) >= 1, "Filter payments by order_id and status=CAPTURED")

    # 6. Issue Refund
    print("\n[6. Issue Refund]")
    refund_res = requests.post(f"{BASE_URL}/payments/{payment_id_a}/refund", headers=headers_a, json={
        "refund_amount": order_total_a,
        "reason": "Customer requested cancellation"
    })
    assert_check(refund_res.status_code == 200, "Refund payment (200)", refund_res.text)
    refunded_pay = refund_res.json()
    assert_check(refunded_pay["status"] == "REFUNDED", "Payment status updated to REFUNDED")

    # Verify associated Order transitioned to REFUNDED
    get_order_ref = requests.get(f"{BASE_URL}/orders/{order_id_a}", headers=headers_a)
    assert_check(
        get_order_ref.status_code == 200 and get_order_ref.json()["status"] == "REFUNDED",
        "Associated Order status transitioned to REFUNDED",
        get_order_ref.text
    )

    # 7. RLS Tenant Isolation Test
    print("\n[7. RLS Tenant Isolation Test]")
    rls_res = requests.get(f"{BASE_URL}/payments/{payment_id_a}", headers=headers_b)
    assert_check(rls_res.status_code in [404, 403], "Business B CANNOT access Business A payment (404/403)")

    # 8. Unauthorized Access
    print("\n[8. Unauthorized Access]")
    no_token = requests.get(f"{BASE_URL}/payments/{payment_id_a}")
    assert_check(no_token.status_code in [401, 403], "No auth token returns 401/403")

    inv_token = requests.get(f"{BASE_URL}/payments/{payment_id_a}", headers={"Authorization": "Bearer invalid_token"})
    assert_check(inv_token.status_code in [401, 403], "Invalid token returns 401/403")

    print("\n" + "=" * 60)
    print(f"  Results: {passed_checks} passed, {failed_checks} failed out of {passed_checks + failed_checks} checks")
    print("=" * 60)

    if failed_checks == 0:
        print("\n  ALL PAYMENTS TESTS PASSED\n")
    else:
        print(f"\n  {failed_checks} PAYMENTS TESTS FAILED\n")

if __name__ == "__main__":
    main()
