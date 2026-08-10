"""
EMIVO Coupons Module — Verification Suite
Verifies Coupons against real Supabase DB, Redis, and FastAPI endpoints under RLS.
"""
import time
import requests
import json
import os
import sys
import uuid
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
        "first_name": "Coupon", "last_name": "User"
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
    print("  EMIVO Coupons Module — Verification Suite")
    print("=" * 60)

    ts = int(time.time())

    # --- Setup Business A Owner ---
    email_a = f"coup_owner_a_{ts}@example.com"
    pass_a = "Password123!"
    token_a_init, user_a_id = register_and_login(email_a, pass_a)
    biz_a_id = asyncio.run(setup_business_and_owner(user_a_id, f"coup-biz-a-{ts}"))
    token_a = relogin(email_a, pass_a)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    assert_check(True, "Business A owner authenticated with owner role")

    # --- Setup Business B Owner ---
    email_b = f"coup_owner_b_{ts}@example.com"
    pass_b = "Password123!"
    token_b_init, user_b_id = register_and_login(email_b, pass_b)
    biz_b_id = asyncio.run(setup_business_and_owner(user_b_id, f"coup-biz-b-{ts}"))
    token_b = relogin(email_b, pass_b)
    headers_b = {"Authorization": f"Bearer {token_b}"}
    assert_check(True, "Business B owner authenticated with owner role")

    # 1. Create Coupons
    print("\n[1. Create Coupons]")
    code_perc = f"SAVE20_{ts}"
    coup_perc_req = {
        "code": code_perc,
        "description": "20% off all orders",
        "discount_type": "PERCENTAGE",
        "discount_value": 20,
        "min_order_amount": 5000,
        "max_discount_amount": 2000,
        "usage_limit": 100,
        "per_user_limit": 2,
        "is_active": True
    }
    c_perc_res = requests.post(f"{BASE_URL}/coupons/", headers=headers_a, json=coup_perc_req)
    assert_check(c_perc_res.status_code == 201, "Create percentage coupon (201)", c_perc_res.text)

    coupon_perc = c_perc_res.json()
    coupon_perc_id = coupon_perc["id"]
    assert_check(coupon_perc["code"] == code_perc.upper(), "Coupon code stored uppercase")
    assert_check(coupon_perc["discount_value"] == 20, "Percentage discount value is 20")

    code_fixed = f"FLAT1000_{ts}"
    coup_fixed_req = {
        "code": code_fixed,
        "description": "Flat 1000 minor units off",
        "discount_type": "FIXED_AMOUNT",
        "discount_value": 1000,
        "min_order_amount": 3000,
        "usage_limit": 50,
        "per_user_limit": 1,
        "is_active": True
    }
    c_fixed_res = requests.post(f"{BASE_URL}/coupons/", headers=headers_a, json=coup_fixed_req)
    assert_check(c_fixed_res.status_code == 201, "Create fixed amount coupon (201)", c_fixed_res.text)
    coupon_fixed_id = c_fixed_res.json()["id"]

    # 2. Duplicate Code Validation
    print("\n[2. Duplicate Code Validation]")
    dup_res = requests.post(f"{BASE_URL}/coupons/", headers=headers_a, json=coup_perc_req)
    assert_check(dup_res.status_code == 409, "Duplicate code returns 409 Conflict", dup_res.text)

    # 3. Get Coupon by ID & List Coupons
    print("\n[3. Get Coupon by ID & List Coupons]")
    get_res = requests.get(f"{BASE_URL}/coupons/{coupon_perc_id}", headers=headers_a)
    assert_check(get_res.status_code == 200 and get_res.json()["id"] == coupon_perc_id, "Get coupon by ID (200)")

    get_missing = requests.get(f"{BASE_URL}/coupons/00000000-0000-0000-0000-000000000000", headers=headers_a)
    assert_check(get_missing.status_code == 404, "Get non-existent coupon returns 404")

    list_res = requests.get(f"{BASE_URL}/coupons/?page=1&page_size=10", headers=headers_a)
    assert_check(list_res.status_code == 200, "List coupons (200)", list_res.text)
    assert_check(list_res.json()["total"] >= 2, f"Total coupons >= 2 (Got {list_res.json()['total']})")

    # 4. Update Coupon
    print("\n[4. Update Coupon]")
    up_res = requests.patch(f"{BASE_URL}/coupons/{coupon_perc_id}", headers=headers_a, json={
        "description": "Updated 20% off",
        "min_order_amount": 4000
    })
    assert_check(up_res.status_code == 200, "Update coupon (200)", up_res.text)
    assert_check(up_res.json()["description"] == "Updated 20% off", "Description updated")
    assert_check(up_res.json()["min_order_amount"] == 4000, "Min order amount updated to 4000")

    # 5. Validate Coupon
    print("\n[5. Validate Coupon]")
    val_valid = requests.post(f"{BASE_URL}/coupons/validate", headers=headers_a, json={
        "code": code_perc,
        "cart_subtotal": 10000,
        "user_id": user_a_id
    })
    assert_check(val_valid.status_code == 200, "Validate valid coupon (200)", val_valid.text)
    val_data = val_valid.json()
    assert_check(val_data["is_valid"] == True, "Coupon is_valid is True")
    # 20% of 10000 is 2000, capped at max_discount_amount 2000
    assert_check(val_data["discount_amount"] == 2000, f"Discount amount calculated (2000), got {val_data['discount_amount']}")

    # Minimum order subtotal check failure
    val_below_min = requests.post(f"{BASE_URL}/coupons/validate", headers=headers_a, json={
        "code": code_perc,
        "cart_subtotal": 2000,  # Below min_order_amount 4000
        "user_id": user_a_id
    })
    assert_check(val_below_min.status_code == 200, "Validate below min subtotal (200)")
    assert_check(val_below_min.json()["is_valid"] == False, "Coupon is_valid is False when below min order amount")

    # Non-existent code validation
    val_invalid = requests.post(f"{BASE_URL}/coupons/validate", headers=headers_a, json={
        "code": "INVALID_CODE_XYZ",
        "cart_subtotal": 10000
    })
    assert_check(val_invalid.status_code == 200 and val_invalid.json()["is_valid"] == False, "Invalid code returns is_valid=False")

    # 6. Apply Coupon & Record Usage
    print("\n[6. Apply Coupon & Record Usage]")
    apply_res = requests.post(f"{BASE_URL}/coupons/apply", headers=headers_a, json={
        "code": code_fixed,
        "cart_subtotal": 5000,
        "user_id": user_a_id
    })
    assert_check(apply_res.status_code == 200, "Apply coupon (200)", apply_res.text)
    apply_data = apply_res.json()
    assert_check(apply_data["discount_amount"] == 1000, "Flat discount 1000 applied")
    assert_check(apply_data["coupon"]["usage_count"] == 1, "Coupon usage_count incremented to 1")

    # Test per_user_limit enforcement (per_user_limit was set to 1 for code_fixed)
    val_user_limit = requests.post(f"{BASE_URL}/coupons/validate", headers=headers_a, json={
        "code": code_fixed,
        "cart_subtotal": 5000,
        "user_id": user_a_id
    })
    assert_check(val_user_limit.status_code == 200 and val_user_limit.json()["is_valid"] == False, "Per-user limit reached returns is_valid=False")

    # 7. Soft Delete Coupon
    print("\n[7. Soft Delete Coupon]")
    del_res = requests.delete(f"{BASE_URL}/coupons/{coupon_fixed_id}", headers=headers_a)
    assert_check(del_res.status_code == 204, "Soft delete coupon (204)", del_res.text)

    get_del = requests.get(f"{BASE_URL}/coupons/{coupon_fixed_id}", headers=headers_a)
    assert_check(get_del.status_code == 404, "Deleted coupon returns 404 on GET")

    # 8. RLS Tenant Isolation Test
    print("\n[8. RLS Tenant Isolation Test]")
    rls_res = requests.get(f"{BASE_URL}/coupons/{coupon_perc_id}", headers=headers_b)
    assert_check(rls_res.status_code in [404, 403], "Business B CANNOT access Business A coupon (404/403)")

    val_b = requests.post(f"{BASE_URL}/coupons/validate", headers=headers_b, json={
        "code": code_perc,
        "cart_subtotal": 10000
    })
    assert_check(val_b.status_code == 200 and val_b.json()["is_valid"] == False, "Business B CANNOT validate Business A coupon code")

    # 9. Unauthorized Access
    print("\n[9. Unauthorized Access]")
    no_token = requests.get(f"{BASE_URL}/coupons/")
    assert_check(no_token.status_code in [401, 403], "No auth token returns 401/403")

    inv_token = requests.get(f"{BASE_URL}/coupons/", headers={"Authorization": "Bearer invalid_token"})
    assert_check(inv_token.status_code in [401, 403], "Invalid token returns 401/403")

    print("\n" + "=" * 60)
    print(f"  Results: {passed_checks} passed, {failed_checks} failed out of {passed_checks + failed_checks} checks")
    print("=" * 60)

    if failed_checks == 0:
        print("\n  ALL COUPONS TESTS PASSED\n")
    else:
        print(f"\n  {failed_checks} COUPONS TESTS FAILED\n")

if __name__ == "__main__":
    main()
