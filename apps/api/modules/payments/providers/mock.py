import uuid
from typing import Any, Optional
from modules.payments.providers.base import BasePaymentProvider

class MockProvider(BasePaymentProvider):
    name = "mock"

    async def create_order(
        self,
        amount: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "id": f"mock_order_{uuid.uuid4().hex[:10]}",
            "payment_session_id": f"session_{uuid.uuid4().hex[:10]}",
            "cf_order_id": f"cf_{uuid.uuid4().hex[:10]}",
        }

    async def verify_signature(self, payload: str, signature: str, secret: str = None) -> bool:
        return signature == "valid_mock_signature"

    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        return {"id": payment_id, "status": "captured", "amount": 1000}

    async def refund(
        self, provider_payment_id: str, amount: Optional[int] = None, speed: str = "normal"
    ) -> dict[str, Any]:
        return {"id": f"mock_rfnd_{uuid.uuid4().hex[:10]}"}
