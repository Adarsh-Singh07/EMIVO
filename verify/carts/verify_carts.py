"""
verify/carts/verify_carts.py

Comprehensive verification suite for the EMIVO Carts module.
Verifies get/create cart (user and guest session), item addition with price resolution,
quantity updates, item removal, cart clearing, and RLS tenant isolation against real Supabase.

Usage:
    python verify/carts/verify_carts.py
"""
import sys
import time
import requests
import asyncio
import os
import uuid
import jwt
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
    print("  EMIVO Carts Module — Verification Suite")
    print("=" * 60)

    ts = int(time.time())
    pwd = "Password123!"

    # ------------------------------------------------------------------
    # Setup: Business A Owner & Business B Owner
    # ------------------------------------------------------------------
    print("\n[Setup: Business A Owner]")
    email_a = f"cart_biz_a_{ts}@example.com"
    token_a_init, user_id_a = register_and_login(email_a, pwd)
    biz_a_id = asyncio.run(setup_business_and_owner(user_id_a, f"cart-biz-a-{ts}"))
    token_a, decoded_a = relogin(email_a, pwd)
    assert_check("owner" in decoded_a.get("roles", []), "Business A owner authenticated")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    print("\n[Setup: Business B Owner]")
    email_b = f"cart_biz_b_{ts}@example.com"
    token_b_init, user_id_b = register_and_login(email_b, pwd)
    biz_b_id = asyncio.run(setup_business_and_owner(user_id_b, f"cart-biz-b-{ts}"))
    token_b, decoded_b = relogin(email_b, pwd)
    assert_check("owner" in decoded_b.get("roles", []), "Business B owner authenticated")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # ------------------------------------------------------------------
    # Setup Data in Business A: Product & Variant
    # ------------------------------------------------------------------
    print("\n[Setup Product & Variant in Business A]")
    prod_res = requests.post(f"{BASE_URL}/products/", json={
        "name": "Mechanical Keyboard",
        "price": 8500,
        "sku": f"KEY-{ts}"
    }, headers=headers_a)
    assert_check(prod_res.status_code == 201, "Create product (201)", prod_res.text)
    product_id = prod_res.json()["id"]

    var_res = requests.post(f"{BASE_URL}/products/{product_id}/variants", json={
        "name": "Wireless RGB Switch",
        "price": 10500,
        "sku": f"KEY-RGB-{ts}"
    }, headers=headers_a)
    assert_check(var_res.status_code == 201, "Add variant (201)", var_res.text)
    variant_id = var_res.json()["id"]

    # ------------------------------------------------------------------
    # 1. Get or Create Cart (Guest Session & User Cart)
    # ------------------------------------------------------------------
    print("\n[1. Get or Create Cart]")
    session_id = f"sess_{ts}"
    cart_res1 = requests.get(f"{BASE_URL}/carts?session_id={session_id}", headers=headers_a)
    assert_check(cart_res1.status_code == 200, "Create guest cart (200)", cart_res1.text)
    cart_data1 = cart_res1.json()
    cart_id = cart_data1.get("id")
    assert_check(cart_data1.get("session_id") == session_id, "Cart session_id matches")
    assert_check(cart_data1.get("subtotal") == 0, "Initial subtotal is 0")
    assert_check(cart_data1.get("items") == [], "Initial items empty")

    # Re-call get_or_create_cart returns existing cart
    cart_res2 = requests.get(f"{BASE_URL}/carts?session_id={session_id}", headers=headers_a)
    assert_check(cart_res2.status_code == 200, "Get existing cart (200)")
    assert_check(cart_res2.json()["id"] == cart_id, "Returns same cart_id")

    # ------------------------------------------------------------------
    # 2. Add Product Item to Cart
    # ------------------------------------------------------------------
    print("\n[2. Add Product Item to Cart]")
    item_res1 = requests.post(f"{BASE_URL}/carts/{cart_id}/items", json={
        "product_id": product_id,
        "quantity": 2
    }, headers=headers_a)
    assert_check(item_res1.status_code == 201, "Add product item to cart (201)", item_res1.text)
    cart_after1 = item_res1.json()
    assert_check(len(cart_after1["items"]) == 1, "Cart has 1 item")

    # Price calculation: 8500 * 2 = 17000
    item1 = cart_after1["items"][0]
    assert_check(item1["unit_price"] == 8500, "Product unit_price is 8500")
    assert_check(item1["subtotal"] == 17000, "Item subtotal is 17000")
    assert_check(cart_after1["subtotal"] == 17000, "Cart subtotal is 17000")
    item1_id = item1["id"]

    # ------------------------------------------------------------------
    # 3. Add Variant Item to Cart
    # ------------------------------------------------------------------
    print("\n[3. Add Variant Item to Cart]")
    item_res2 = requests.post(f"{BASE_URL}/carts/{cart_id}/items", json={
        "product_id": product_id,
        "variant_id": variant_id,
        "quantity": 1
    }, headers=headers_a)
    assert_check(item_res2.status_code == 201, "Add variant item to cart (201)", item_res2.text)
    cart_after2 = item_res2.json()
    assert_check(len(cart_after2["items"]) == 2, "Cart now has 2 items")

    # Subtotal calculation: 17000 + 10500 = 27500
    assert_check(cart_after2["subtotal"] == 27500, "Cart subtotal is 27500 (17000 + 10500)")

    # ------------------------------------------------------------------
    # 4. Update Item Quantity
    # ------------------------------------------------------------------
    print("\n[4. Update Item Quantity]")
    update_res = requests.patch(f"{BASE_URL}/carts/{cart_id}/items/{item1_id}", json={
        "quantity": 3
    }, headers=headers_a)
    assert_check(update_res.status_code == 200, "Update item quantity (200)", update_res.text)
    cart_after_upd = update_res.json()

    # Subtotal calculation: (8500 * 3) + 10500 = 25500 + 10500 = 36000
    assert_check(cart_after_upd["subtotal"] == 36000, "Cart subtotal updated to 36000")

    # ------------------------------------------------------------------
    # 5. Get Cart by ID
    # ------------------------------------------------------------------
    print("\n[5. Get Cart by ID]")
    get_cart_res = requests.get(f"{BASE_URL}/carts/{cart_id}", headers=headers_a)
    assert_check(get_cart_res.status_code == 200, "Get cart by ID (200)")
    assert_check(get_cart_res.json()["subtotal"] == 36000, "Get cart subtotal matches")

    get_missing = requests.get(f"{BASE_URL}/carts/00000000-0000-0000-0000-000000000000", headers=headers_a)
    assert_check(get_missing.status_code == 404, "Get non-existent cart returns 404")

    # ------------------------------------------------------------------
    # 6. Remove Item from Cart
    # ------------------------------------------------------------------
    print("\n[6. Remove Item from Cart]")
    rem_res = requests.delete(f"{BASE_URL}/carts/{cart_id}/items/{item1_id}", headers=headers_a)
    assert_check(rem_res.status_code == 200, "Remove item (200)", rem_res.text)
    cart_after_rem = rem_res.json()
    assert_check(len(cart_after_rem["items"]) == 1, "Cart has 1 item remaining")
    assert_check(cart_after_rem["subtotal"] == 10500, "Subtotal recalculated to 10500")

    # ------------------------------------------------------------------
    # 7. Clear Cart
    # ------------------------------------------------------------------
    print("\n[7. Clear Cart]")
    clear_res = requests.post(f"{BASE_URL}/carts/{cart_id}/clear", headers=headers_a)
    assert_check(clear_res.status_code == 200, "Clear cart (200)", clear_res.text)
    cart_cleared = clear_res.json()
    assert_check(len(cart_cleared["items"]) == 0, "Cart items empty")
    assert_check(cart_cleared["subtotal"] == 0, "Cart subtotal reset to 0")

    # ------------------------------------------------------------------
    # 8. RLS Tenant Isolation Test
    # ------------------------------------------------------------------
    print("\n[8. RLS Tenant Isolation Test]")
    cross_get = requests.get(f"{BASE_URL}/carts/{cart_id}", headers=headers_b)
    assert_check(cross_get.status_code in (403, 404), "Business B CANNOT access Business A cart (404/403)", cross_get.text)

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
        print("\n  ALL CARTS TESTS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
