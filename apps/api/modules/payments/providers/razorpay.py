import hashlib
import hmac
import uuid
from typing import Any

from .base import BasePaymentProvider


class RazorpayMockProvider(BasePaymentProvider):
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret

    async def create_order(
        self,
        amount: float,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        # Amount in paise for INR
        amount_in_smallest_unit = int(amount * 100) if currency == "INR" else amount
        return {
            "id": f"order_{uuid.uuid4().hex[:14]}",
            "entity": "order",
            "amount": amount_in_smallest_unit,
            "amount_paid": 0,
            "amount_due": amount_in_smallest_unit,
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
            "amount": 100000,
            "currency": "INR",
            "status": "captured",
            "method": "card",
            # Tokenized card data, no raw PAN
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
