import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = f"test_{int(time.time())}@example.com"
TEST_PASSWORD = "StrongPassword123!"

def print_step(step):
    print(f"\n[{step}]")

def main():
    print("Starting Authentication Verification Flow...")

    # 1. Register
    print_step("1. Registering user")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": "User"
    })
    
    if resp.status_code != 201:
        print(f"FAILED: Registration returned {resp.status_code} - {resp.text}")
        sys.exit(1)
    print("Registration successful!")

    # 2. Login
    print_step("2. Logging in")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    if resp.status_code != 200:
        print(f"FAILED: Login returned {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    tokens = resp.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    print(f"Login successful! Received JWT and Refresh Token.")

    # 3. Call /users/me
    print_step("3. Calling /users/me")
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    
    if resp.status_code != 200:
        print(f"FAILED: /users/me returned {resp.status_code} - {resp.text}")
        sys.exit(1)
    print(f"User retrieved: {resp.json()['email']}")

    # 4. Refresh Access Token
    print_step("4. Refreshing Access Token")
    resp = requests.post(f"{BASE_URL}/auth/refresh", json={
        "refresh_token": refresh_token
    })
    
    if resp.status_code != 200:
        print(f"FAILED: Refresh returned {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    new_tokens = resp.json()
    new_access_token = new_tokens["access_token"]
    new_refresh_token = new_tokens["refresh_token"]
    print("Refresh successful! New tokens issued.")

    # 5. Old Refresh Token invalid (Replay Detection)
    print_step("5. Testing Replay Detection (using old refresh token)")
    resp = requests.post(f"{BASE_URL}/auth/refresh", json={
        "refresh_token": refresh_token
    })
    
    if resp.status_code == 401:
        print("SUCCESS: Replay detected and rejected!")
    else:
        print(f"FAILED: Replay was NOT rejected! Status: {resp.status_code}")
        sys.exit(1)

    # Note: Family is now invalidated because of replay!
    # Let's try to use the new refresh token, it should also fail because the whole family was revoked.
    print_step("6. Verifying entire family was invalidated after replay")
    resp = requests.post(f"{BASE_URL}/auth/refresh", json={
        "refresh_token": new_refresh_token
    })
    if resp.status_code == 401:
        print("SUCCESS: Family was revoked successfully.")
    else:
        print(f"FAILED: Family was not revoked! Status: {resp.status_code}")
        sys.exit(1)

    print("\n--- ALL TESTS PASSED ---")

if __name__ == "__main__":
    main()
