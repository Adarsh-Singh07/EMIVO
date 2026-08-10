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
TEST_EMAIL = f"test_{int(time.time())}@example.com"
TEST_PASSWORD = "StrongPassword123!"

def print_step(step):
    print(f"\n[{step}]")

def main():
    print("Starting Products Verification Flow...")

    # 1. Register & Login to get token
    print_step("1. Setup Auth (Register & Login)")
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": "ProductUser"
    })
    
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if resp.status_code != 200:
        print(f"FAILED Auth: {resp.text}")
        sys.exit(1)
        
    access_token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Extract user ID
    user_resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    user_id = user_resp.json()["id"]

    # 1.5 Setup DB Business
    print_step("1.5 Setup Test Business Context")
    engine = create_async_engine(os.environ['DATABASE_URL'])
    
    async def setup_db():
        async with engine.begin() as conn:
            # Create a test business
            business_id = str(uuid.uuid4())
            await conn.execute(text(f"""
                INSERT INTO businesses (id, name, slug, is_active, settings, contact_email) 
                VALUES ('{business_id}', 'Test Business', 'test-business-{int(time.time())}', true, '{{}}'::jsonb, 'test@business.com')
                ON CONFLICT DO NOTHING
            """))
            # Link user as OWNER
            member_id = str(uuid.uuid4())
            await conn.execute(text(f"""
                INSERT INTO business_members (id, user_id, business_id, role)
                VALUES ('{member_id}', '{user_id}', '{business_id}', 'owner')
                ON CONFLICT DO NOTHING
            """))
    asyncio.run(setup_db())

    # Re-login to get updated token with roles and business_id
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    access_token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Check current user payload
    me_resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    print(f"Me Response: {me_resp.json()}")
    
    # Decode token payload
    decoded = jwt.decode(access_token, options={"verify_signature": False})
    print(f"Decoded Token: {decoded}")

    # 2. Create Product
    print_step("2. Creating a Product")
    product_data = {
        "name": "Test Product",
        "price": 1000,
        "description": "A very good product",
        "sku": "SKU-123"
    }
    resp = requests.post(f"{BASE_URL}/products/", json=product_data, headers=headers)
    if resp.status_code != 201:
        print(f"FAILED Create Product: {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    product_id = resp.json()["id"]
    print(f"Product Created: {product_id}")

    # 3. List Products
    print_step("3. Listing Products")
    resp = requests.get(f"{BASE_URL}/products/", headers=headers)
    if resp.status_code != 200:
        print(f"FAILED List Products: {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    products = resp.json()
    print(f"Found {len(products)} products.")

    # 4. Get Product
    print_step("4. Getting Product")
    resp = requests.get(f"{BASE_URL}/products/{product_id}", headers=headers)
    if resp.status_code != 200:
        print(f"FAILED Get Product: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print("Product fetched successfully.")

    # 5. Add Variant
    print_step("5. Adding Variant")
    variant_data = {
        "name": "Large",
        "price": 1200,
        "sku": "SKU-123-L"
    }
    resp = requests.post(f"{BASE_URL}/products/{product_id}/variants", json=variant_data, headers=headers)
    if resp.status_code != 201:
        print(f"FAILED Add Variant: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print("Variant added successfully.")

    # 6. Update Product
    print_step("6. Updating Product")
    update_data = {
        "price": 1500
    }
    resp = requests.put(f"{BASE_URL}/products/{product_id}", json=update_data, headers=headers)
    if resp.status_code != 200:
        print(f"FAILED Update Product: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print(f"Product updated successfully: new price = {resp.json()['price']}")
    
    # 7. Delete Product
    print_step("7. Deleting Product")
    resp = requests.delete(f"{BASE_URL}/products/{product_id}", headers=headers)
    if resp.status_code != 204:
        print(f"FAILED Delete Product: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print("Product deleted successfully.")

    print("\n--- ALL PRODUCTS TESTS PASSED ---")

if __name__ == "__main__":
    main()
