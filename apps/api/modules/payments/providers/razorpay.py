"""Razorpay provider.

Two implementations live here:
  - RazorpayProvider: real REST integration (Orders / Payments / Refunds APIs)
    over httpx with HTTP Basic auth. Used when PAYMENT_PROVIDER=razorpay.
  - RazorpayMockProvider: deterministic local simulation used for tests and
    local development. Never selected in prod (see service.get_provider).
"""
import hashlib
import hmac
import logging
import uuid
from typing import Any, Optional

import httpx

from .base import BasePaymentProvider

logger = logging.getLogger(__name__)

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"


class RazorpayProvider(BasePaymentProvider):
    name = "razorpay"

    def __init__(self, api_key: str, api_secret: str, timeout: float = 15.0):
        if not api_key or not api_secret:
            raise ValueError("RazorpayProvider requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
        self.api_key = api_key
        self.api_secret = api_secret
        self.timeout = timeout

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=RAZORPAY_API_BASE,
            auth=(self.api_key, self.api_secret),
            timeout=self.timeout,
        )

    async def create_order(
        self,
        amount: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        async with self._client() as client:
            resp = await client.post(
                "/orders",
                json={
                    "amount": int(amount),
                    "currency": currency,
                    "receipt": receipt[:40],
                    "notes": notes or {},
                    "payment_capture": 1,
                },
            )
        if resp.status_code not in (200, 201):
            logger.error("razorpay create_order failed %s: %s", resp.status_code, resp.text[:500])
            raise RuntimeError(f"Razorpay order creation failed ({resp.status_code})")
        return resp.json()

    async def verify_signature(self, payload: str, signature: str, secret: str) -> bool:
        secret_to_use = secret or self.api_secret
        expected = hmac.new(
            secret_to_use.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        async with self._client() as client:
            resp = await client.get(f"/payments/{payment_id}")
        if resp.status_code != 200:
            raise RuntimeError(f"Razorpay fetch payment failed ({resp.status_code})")
        return resp.json()

    async def refund(
        self, provider_payment_id: str, amount: Optional[int] = None, speed: str = "normal"
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"speed": speed}
        if amount is not None:
            body["amount"] = int(amount)
        async with self._client() as client:
            resp = await client.post(f"/payments/{provider_payment_id}/refund", json=body)
        if resp.status_code not in (200, 201):
            logger.error("razorpay refund failed %s: %s", resp.status_code, resp.text[:500])
            raise RuntimeError(f"Razorpay refund failed ({resp.status_code})")
        return resp.json()


class RazorpayMockProvider(BasePaymentProvider):
    """Deterministic simulation: fabricates provider ids locally and signs
    payloads with the provided secret so signature verification paths can be
    exercised end-to-end without network access or real money."""

    name = "mock"

    def __init__(self, api_key: str = "mock_key", api_secret: str = "mock_secret"):
        self.api_key = api_key
        self.api_secret = api_secret
        self._refunds: dict[str, list[dict]] = {}

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

    async def verify_signature(self, payload: str, signature: str, secret: str = None) -> bool:
        secret_to_use = secret or self.api_secret
        expected = hmac.new(
            secret_to_use.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        return {
            "id": payment_id,
            "entity": "payment",
            "status": "captured",
            "method": "upi",
            "currency": "INR",
        }

    async def refund(
        self, provider_payment_id: str, amount: Optional[int] = None, speed: str = "normal"
    ) -> dict[str, Any]:
        refund = {
            "id": f"rfnd_{uuid.uuid4().hex[:14]}",
            "entity": "refund",
            "payment_id": provider_payment_id,
            "amount": amount,
            "status": "processed",
            "speed": speed,
        }
        self._refunds.setdefault(provider_payment_id, []).append(refund)
        return refund

    def sign(self, payload: str, secret: str = None) -> str:
        secret_to_use = secret or self.api_secret
        return hmac.new(
            secret_to_use.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()
