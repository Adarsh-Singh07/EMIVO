import asyncio
import os
from core.config import settings
from modules.payments.providers.easebuzz import EaseBuzzProvider

async def main():
    provider = EaseBuzzProvider(
        merchant_key=settings.easebuzz_merchant_key,
        salt=settings.easebuzz_salt,
        environment=settings.easebuzz_environment
    )
    print(f"Testing with Key: {settings.easebuzz_merchant_key}")
    print(f"Testing with Env: {settings.easebuzz_environment}")

    try:
        res = await provider.create_order(
            amount=1000, # 10.00 INR
            currency="INR",
            receipt="receipt_test_123",
            customer_email="test@example.com",
            customer_phone="9999999999",
            customer_name="Test User",
            notes={"productinfo": "Test Product"}
        )
        print("Success!")
        print(res)
    except Exception as e:
        print("Failed!")
        print(e)

if __name__ == "__main__":
    asyncio.run(main())
