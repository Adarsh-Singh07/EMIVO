import base64
import hashlib
import hmac
import logging
import secrets
from typing import Any, Optional
import httpx

from core.config import settings
from core.exceptions import DomainException
from modules.payments.providers.base import BasePaymentProvider

logger = logging.getLogger(__name__)

class CashfreeProvider(BasePaymentProvider):
    name = "cashfree"

    def __init__(self, client_id: str, client_secret: str, environment: str = "sandbox"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.environment = environment
        
        self.base_url = "https://sandbox.cashfree.com/pg" if environment.lower() == "sandbox" else "https://api.cashfree.com/pg"
        self.api_version = "2023-08-01"

    def _get_headers(self) -> dict[str, str]:
        return {
            "x-client-id": self.client_id,
            "x-client-secret": self.client_secret,
            "x-api-version": self.api_version,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def create_order(
        self,
        amount: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/orders"
        
        # Cashfree expects amount in rupees/major currency units as float/string, not minor units
        amount_major = amount / 100.0

        notes = notes or {}
        # Ensure string values for notes to avoid API validation errors
        cf_notes = {str(k)[:50]: str(v)[:255] for k, v in notes.items()} if notes else {}
        
        # Provide fallback customer details if not available
        customer_id = str(notes.get("user_id", "guest_" + receipt))
        customer_phone = str(notes.get("phone", "9999999999"))
        customer_email = str(notes.get("email", "customer@example.com"))

        payload = {
            "order_id": f"cf_{receipt.replace('-', '_')}", # Cashfree requires alphanumeric order_id
            "order_amount": amount_major,
            "order_currency": currency,
            "customer_details": {
                "customer_id": customer_id,
                "customer_phone": customer_phone,
                "customer_email": customer_email,
            },
            "order_meta": {
                "return_url": f"{settings.cors_origins[0] if settings.cors_origins else 'https://elektrix.in'}/order-tracking?orderId={{order_id}}"
            },
            "order_tags": cf_notes,
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=self._get_headers())
            
        if resp.status_code >= 400:
            logger.error(f"Cashfree create_order failed: {resp.text}")
            raise DomainException("Failed to create Cashfree order", code="PAYMENT_FAILED", status_code=502)

        data = resp.json()
        return {
            "id": data.get("order_id"),
            "payment_session_id": data.get("payment_session_id"),
            "cf_order_id": data.get("cf_order_id"),
        }

    async def verify_signature(self, payload: str, signature: str, secret: str = None) -> bool:
        # Cashfree Webhook Signature Verification
        # timestamp is included in the payload by the router or service
        # payload format expected here: timestamp + raw_body
        if not secret:
            secret = self.client_secret
        
        try:
            expected_sig = base64.b64encode(
                hmac.new(
                    secret.encode('utf-8'),
                    payload.encode('utf-8'),
                    hashlib.sha256
                ).digest()
            ).decode('utf-8')
            return hmac.compare_digest(expected_sig, signature)
        except Exception as e:
            logger.error(f"Cashfree verify_signature error: {e}")
            return False

    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        url = f"{self.base_url}/orders/{payment_id}/payments"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._get_headers())
        
        if resp.status_code >= 400:
            logger.error(f"Cashfree fetch_payment failed: {resp.text}")
            return {}
            
        data = resp.json()
        # Returns a list of payments for the order
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return data

    async def verify_payment_by_order(self, cf_order_id: str) -> dict[str, Any]:
        """Fetch payment status from Cashfree for a given Cashfree order ID.
        Returns payment details if successful, empty dict otherwise."""
        url = f"{self.base_url}/orders/{cf_order_id}/payments"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._get_headers())
        
        if resp.status_code >= 400:
            logger.error(f"Cashfree verify_payment_by_order failed: {resp.text}")
            return {}
            
        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            # Return the first (most recent) payment
            payment = data[0]
            return {
                "cf_payment_id": payment.get("cf_payment_id"),
                "payment_status": payment.get("payment_status"),
                "payment_amount": payment.get("payment_amount"),
                "payment_message": payment.get("payment_message"),
            }
        return {}

    async def refund(
        self,
        provider_payment_id: str,
        amount: Optional[int] = None,
        speed: str = "normal",
        provider_order_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Issue a refund against a Cashfree order.

        Cashfree refund API: POST /pg/orders/{cf_order_id}/refunds
        Requires the Cashfree order_id (cf_order_id), not the payment id.
        provider_order_id should be the Cashfree order id; if omitted we
        attempt to extract it from provider_payment_id when it is actually
        an order id.
        """
        cf_order_id: str
        if provider_order_id:
            cf_order_id = provider_order_id
        elif provider_payment_id and provider_payment_id.startswith("cf_"):
            cf_order_id = provider_payment_id
        else:
            # Fallback: fetch the payment to discover the order id.
            payment = await self.fetch_payment(provider_payment_id)
            if not payment:
                raise DomainException(
                    "Could not locate Cashfree order for refund",
                    code="PAYMENT_FAILED",
                    status_code=502,
                )
            cf_order_id = payment.get("order_id") or provider_payment_id

        amount_minor = amount if amount is not None else 0
        amount_major = amount_minor / 100.0 if amount_minor else 0

        payload: dict[str, Any] = {
            "refund_id": f"rf_{secrets.token_hex(8)}",
            "refund_amount": amount_major,
            "refund_reason": "Refund requested by store",
        }
        if amount is None:
            payload["refund_amount"] = 0  # full refund — Cashfree ignores amount for full

        url = f"{self.base_url}/orders/{cf_order_id}/refunds"
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=self._get_headers())

        if resp.status_code >= 400:
            logger.error("Cashfree refund failed: %s", resp.text)
            raise DomainException(
                "Cashfree refund request failed",
                code="PAYMENT_FAILED",
                status_code=502,
            )

        data = resp.json()
        return {
            "id": data.get("refund_id") or data.get("id"),
            "refund_id": data.get("refund_id"),
            "status": data.get("refund_status"),
            "amount": data.get("refund_amount"),
        }
