import hashlib
import hmac
import uuid
from typing import Any

from .base import BasePaymentProvider


class RazorpayMockProvider(BasePaymentProvider):
    def __init__(self, api_key: str = "mock_key", api_secret: str = "mock_secret"):
        self.api_key = api_key
        self.api_secret = api_secret

    async def create_order(
        self,
        amount: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "id": f"order_{uuid.uuid4().hex[:14]}",
            "entity": "order",
            "amount": amount,
            "amount_paid": 0,
            "amount_due": amount,
            "currency": currency,
            "receipt": receipt,
            "status": "created",
            "attempts": 0,
            "notes": notes or {},
            "created_at": 1620000000,
        }

    async def verify_signature(
        self, payload: str, signature: str, secret: str = None
    ) -> bool:
        secret_to_use = secret or self.api_secret
        expected_signature = hmac.new(
            secret_to_use.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)

    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        return {
            "id": payment_id,
            "entity": "payment",
            "amount": 1000,
            "currency": "INR",
            "status": "captured",
            "method": "card",
            "card": {
                "id": "card_abcdef",
                "entity": "card",
                "name": "Test User",
                "last4": "1111",
                "network": "Visa",
                "type": "credit",
                "issuer": "HDFC",
            },
        }
