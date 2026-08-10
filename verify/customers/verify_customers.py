"""
verify/customers/verify_customers.py

Comprehensive Customers module verification.
Tests: CRUD, search, pagination, duplicate email validation,
       soft-delete, and RLS tenant isolation (Business A vs Business B).

Run: python verify/customers/verify_customers.py
Requires: uvicorn running on localhost:8000
"""
import requests
import time
import sys
import asyncio
import os
import uuid
import jwt
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(r'd:\Projects\EMIVO\.env')

BASE_URL = "http://localhost:8000/api/v1"
PASS = "[PASS]"
FAIL = "[FAIL]"

results = []


def print_step(step: str):
    print(f"\n[{step}]")


def check(label: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    msg = f"  {status} {label}"
    if detail:
        msg += f" | {detail}"
    print(msg)
    results.append((label, condition))
    if not condition:
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
    print("=" * 60)
    print("  EMIVO Customers Module — Verification Suite")
    print("=" * 60)
    ts = int(time.time())

    # ---- Setup: Business A ----
    print_step("Setup: Business A Owner")
    email_a = f"biz_a_{ts}@example.com"
    pwd = "StrongPassword123!"
    token_a, user_id_a = register_and_login(email_a, pwd)
    biz_a_id = asyncio.run(setup_business_and_owner(user_id_a, f"biz-a-{ts}"))
    token_a, decoded_a = relogin(email_a, pwd)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    check("Business A: token has owner role", "owner" in decoded_a.get("roles", []), str(decoded_a.get("roles")))

    # ---- Setup: Business B ----
    print_step("Setup: Business B Owner")
    email_b = f"biz_b_{ts}@example.com"
    token_b, user_id_b = register_and_login(email_b, pwd)
    biz_b_id = asyncio.run(setup_business_and_owner(user_id_b, f"biz-b-{ts}"))
    token_b, decoded_b = relogin(email_b, pwd)
    headers_b = {"Authorization": f"Bearer {token_b}"}
    check("Business B: token has owner role", "owner" in decoded_b.get("roles", []), str(decoded_b.get("roles")))

    # ---- 1. Create Customer (Business A) ----
    print_step("1. Create Customer")
    cust_data = {
        "name": "Alice Smith",
        "email": f"alice_{ts}@example.com",
        "phone": "+1-555-0100",
        "address": "123 Main St, Springfield",
        "notes": "VIP customer"
    }
    resp = requests.post(f"{BASE_URL}/customers/", json=cust_data, headers=headers_a)
    check("Create customer (201)", resp.status_code == 201, f"{resp.status_code}: {resp.text[:200]}")
    if resp.status_code != 201:
        sys.exit(1)
    customer = resp.json()
    customer_id = customer["id"]
    check("Customer has correct name", customer["name"] == "Alice Smith")
    check("Customer has correct email", customer["email"] == cust_data["email"])
    check("Customer has notes", customer["notes"] == "VIP customer")
    check("Customer business_id matches", customer["business_id"] == biz_a_id)

    # ---- 2. Duplicate Email Validation ----
    print_step("2. Duplicate Email Validation")
    resp = requests.post(f"{BASE_URL}/customers/", json=cust_data, headers=headers_a)
    check("Duplicate email returns 409", resp.status_code == 409, f"{resp.status_code}: {resp.text[:100]}")

    # ---- 3. Create more customers for pagination/search ----
    print_step("3. Create Additional Customers for Search/Pagination")
    for i in range(3):
        r = requests.post(f"{BASE_URL}/customers/", json={
            "name": f"Customer {i}",
            "email": f"customer{i}_{ts}@example.com",
            "phone": f"+1-555-010{i}"
        }, headers=headers_a)
        check(f"Create customer {i} (201)", r.status_code == 201, r.text[:100])

    # ---- 4. List Customers (pagination) ----
    print_step("4. List Customers with Pagination")
    resp = requests.get(f"{BASE_URL}/customers/?page=1&page_size=2", headers=headers_a)
    check("List customers (200)", resp.status_code == 200, resp.text[:100])
    list_data = resp.json()
    check("Returns items list", "items" in list_data)
    check("Returns total count", list_data["total"] >= 4)
    check("Page size respected", len(list_data["items"]) <= 2)
    check("has_next present", "has_next" in list_data)
    check("has_prev present", "has_prev" in list_data)
    check("has_prev is False on page 1", list_data["has_prev"] == False)
    check("has_next is True (4+ customers, page_size=2)", list_data["has_next"] == True)

    # ---- 5. Search Customers ----
    print_step("5. Search Customers")
    resp = requests.get(f"{BASE_URL}/customers/?search=Alice", headers=headers_a)
    check("Search by name (200)", resp.status_code == 200)
    search_data = resp.json()
    check("Search returns Alice", any("Alice" in c["name"] for c in search_data["items"]),
          f"Got names: {[c['name'] for c in search_data['items']]}")

    resp = requests.get(f"{BASE_URL}/customers/?search=+1-555-0101", headers=headers_a)
    check("Search by phone (200)", resp.status_code == 200)

    resp = requests.get(f"{BASE_URL}/customers/?search=nonexistent_xyz_abc", headers=headers_a)
    check("Search non-existent returns empty", resp.status_code == 200)
    check("Search empty result has 0 total", resp.json()["total"] == 0)

    # ---- 6. Get Customer ----
    print_step("6. Get Customer by ID")
    resp = requests.get(f"{BASE_URL}/customers/{customer_id}", headers=headers_a)
    check("Get customer (200)", resp.status_code == 200)
    check("Get returns correct customer", resp.json()["id"] == customer_id)

    # ---- 7. Get Non-existent Customer ----
    fake_id = str(uuid.uuid4())
    resp = requests.get(f"{BASE_URL}/customers/{fake_id}", headers=headers_a)
    check("Get non-existent returns 404", resp.status_code == 404, resp.text[:100])

    # ---- 8. Update Customer ----
    print_step("7. Update Customer")
    update_data = {"name": "Alice Updated", "phone": "+1-555-9999", "notes": "Updated notes"}
    resp = requests.put(f"{BASE_URL}/customers/{customer_id}", json=update_data, headers=headers_a)
    check("Update customer (200)", resp.status_code == 200, resp.text[:200])
    updated = resp.json()
    check("Name updated", updated["name"] == "Alice Updated")
    check("Phone updated", updated["phone"] == "+1-555-9999")
    check("Notes updated", updated["notes"] == "Updated notes")
    check("Email unchanged", updated["email"] == cust_data["email"])

    # ---- 9. Update with duplicate email from another customer ----
    print_step("8. Duplicate Email on Update")
    resp = requests.put(f"{BASE_URL}/customers/{customer_id}", json={
        "email": f"customer0_{ts}@example.com"  # Already taken by another customer
    }, headers=headers_a)
    check("Duplicate email on update returns 409", resp.status_code == 409, f"{resp.status_code}: {resp.text[:100]}")

    # ---- 10. RLS Isolation Test ----
    print_step("9. RLS Tenant Isolation Test")
    # Business B tries to access Business A's customer
    resp_cross = requests.get(f"{BASE_URL}/customers/{customer_id}", headers=headers_b)
    check(
        "Business B CANNOT access Business A customer (404 or 403)",
        resp_cross.status_code in (404, 403),
        f"Got {resp_cross.status_code}: {resp_cross.text[:100]}"
    )

    # Business B creates its own customer
    resp_b_create = requests.post(f"{BASE_URL}/customers/", json={
        "name": "Bob Jones",
        "email": f"bob_{ts}@example.com"
    }, headers=headers_b)
    check("Business B can create its own customer", resp_b_create.status_code == 201,
          resp_b_create.text[:100])

    # Business A list should NOT contain Business B's customer
    resp_a_list = requests.get(f"{BASE_URL}/customers/", headers=headers_a)
    a_emails = [c["email"] for c in resp_a_list.json()["items"]]
    check(
        "Business A list does NOT contain Business B customer",
        f"bob_{ts}@example.com" not in a_emails,
        f"Emails in A: {a_emails}"
    )

    # ---- 11. Soft Delete ----
    print_step("10. Soft Delete Customer")
    resp = requests.delete(f"{BASE_URL}/customers/{customer_id}", headers=headers_a)
    check("Delete customer (204)", resp.status_code == 204, resp.text[:100])

    # Customer should no longer be findable
    resp = requests.get(f"{BASE_URL}/customers/{customer_id}", headers=headers_a)
    check("Deleted customer returns 404", resp.status_code == 404, resp.text[:100])

    # Customer should no longer appear in list
    resp = requests.get(f"{BASE_URL}/customers/?search=Alice", headers=headers_a)
    search_after_delete = resp.json()
    alice_still_present = any(c["id"] == customer_id for c in search_after_delete["items"])
    check("Deleted customer absent from list", not alice_still_present)

    # ---- 12. Unauthorized access ----
    print_step("11. Unauthorized Access")
    resp = requests.get(f"{BASE_URL}/customers/")
    check("No token returns 403", resp.status_code in (401, 403), f"{resp.status_code}")

    resp = requests.get(f"{BASE_URL}/customers/", headers={"Authorization": "Bearer invalid.token.here"})
    check("Invalid token returns 401/403", resp.status_code in (401, 403), f"{resp.status_code}")

    # ---- Summary ----
    print("\n" + "=" * 60)
    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    print(f"  Results: {passed} passed, {failed} failed out of {len(results)} checks")

    if failed > 0:
        print("\n  FAILED CHECKS:")
        for label, ok in results:
            if not ok:
                print(f"    - {label}")
        print("=" * 60)
        sys.exit(1)
    else:
        print("\n  ALL CUSTOMERS TESTS PASSED")
        print("=" * 60)


if __name__ == "__main__":
    main()
