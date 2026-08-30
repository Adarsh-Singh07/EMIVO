import asyncio
import httpx
import hashlib
import os

key = os.environ.get("EASEBUZZ_MERCHANT_KEY", "D85J2L6D3F")
salt = os.environ.get("EASEBUZZ_SALT", "6Z75N7P59X")
env = os.environ.get("EASEBUZZ_ENVIRONMENT", "test")

def compute_sha512(text: str) -> str:
    return hashlib.sha512(text.encode("utf-8")).hexdigest()

async def main():
    txnid = "TEST_TXN_001"
    amount = "10.00"
    productinfo = "Test Product"
    firstname = "Test"
    email = "test@example.com"
    
    hash_str = compute_sha512(f"{key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|||||||||||{salt}")
    
    payload = {
        "key": key,
        "txnid": txnid,
        "amount": amount,
        "productinfo": productinfo,
        "firstname": firstname,
        "email": email,
        "phone": "9999999999",
        "surl": "https://elektrix.in/api/v1/payments/easebuzz/callback",
        "furl": "https://elektrix.in/api/v1/payments/easebuzz/callback",
        "hash": hash_str,
    }
    url = "https://testpay.easebuzz.in/payment/initiateLink"
    print(f"Sending to {url} with key {key}")
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=payload)
        
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    asyncio.run(main())
