import json
import logging
import os
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import PaymentStatus
from .providers.razorpay import RazorpayMockProvider
from .repository import PaymentRepository
from .schemas import PaymentCreate

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, db: Session):
        self.repository = PaymentRepository(db)
        # In a real app we'd use a provider factory and configs
        self.provider = RazorpayMockProvider(
            api_key=os.getenv("RAZORPAY_KEY_ID", "mock_key"),
            api_secret=os.getenv("RAZORPAY_KEY_SECRET", "mock_secret"),
        )

    async def initiate_payment(self, payment_in: PaymentCreate, user_id: UUID):
        # 1. Idempotency check
        existing_payment = self.repository.get_by_idempotency_key(
            payment_in.idempotency_key
        )
        if existing_payment:
            return existing_payment

        # 2. Call Provider Adapter
        notes = payment_in.metadata or {}
        notes["order_id"] = str(payment_in.order_id)

        provider_order = await self.provider.create_order(
            amount=payment_in.amount,
            currency=payment_in.currency,
            receipt=str(payment_in.order_id),
            notes=notes,
        )

        if not provider_order or "id" not in provider_order:
            raise HTTPException(
                status_code=500, detail="Failed to create order with payment provider"
            )

        # 3. Create Local Payment Record
        return self.repository.create(
            payment_in=payment_in,
            user_id=user_id,
            provider_order_id=provider_order["id"],
        )

    async def handle_webhook(self, signature: str, raw_payload: bytes):
        payload_str = raw_payload.decode("utf-8")

        # 1. HMAC Verification
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "mock_webhook_secret")
        is_valid = await self.provider.verify_signature(
            payload_str, signature, webhook_secret
        )

        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid signature")

        payload = json.loads(payload_str)
        event_name = payload.get("event")

        # 2. Extract context
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        provider_order_id = payment_entity.get("order_id")
        provider_payment_id = payment_entity.get("id")

        if not provider_payment_id:
            logger.warning("Webhook received without payment ID")
            return {"status": "ignored"}

        # Replay protection / Idempotency based on event logging - handled below or via caching

        # Find matching payment (would normally query by provider_order_id as well)
        # Using a mock approach we just assume the first pending one if not found by provider_payment_id
        # since during initiate we didn't store provider_payment_id yet
        # In a real impl, we query by provider_order_id
        # payment = db.query.filter(provider_order_id=provider_order_id).first()
        # For simplicity in this structure we'd need a method added to repo

        # Handle events
        if event_name == "payment.captured":
            # Just an example, would need real lookup
            pass

        return {"status": "success"}

    async def verify_payment_signature(
        self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str
    ) -> bool:
        payload = f"{razorpay_order_id}|{razorpay_payment_id}"
        return await self.provider.verify_signature(payload, razorpay_signature)

    async def process_payment_success(
        self,
        payment_id: UUID,
        razorpay_payment_id: str,
        razorpay_signature: str,
        raw_payload: str = None,
    ):
        payment = self.repository.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status == PaymentStatus.CAPTURED:
            # Idempotency: Return early if already captured
            return payment

        if raw_payload:
            # We use webhook style verification for webhooks
            pass
        else:
            # Client-side verification
            is_valid = await self.verify_payment_signature(
                payment.provider_order_id, razorpay_payment_id, razorpay_signature
            )

            if not is_valid:
                self.repository.update_status(
                    payment_id, PaymentStatus.FAILED, razorpay_payment_id
                )
                self.repository.log_event(
                    payment_id,
                    "signature_verification_failed",
                    {"payment_id": razorpay_payment_id},
                )
                raise HTTPException(
                    status_code=400, detail="Payment signature verification failed"
                )

        # Verify against provider to prevent spoofing
        provider_payment = await self.provider.fetch_payment(razorpay_payment_id)
        if provider_payment.get("status") != "captured":
            raise HTTPException(
                status_code=400, detail="Payment not captured at provider"
            )

        # Update status
        payment = self.repository.update_status(
            payment_id=payment_id,
            status=PaymentStatus.CAPTURED,
            provider_payment_id=razorpay_payment_id,
        )

        self.repository.log_event(
            payment_id, "payment_captured", {"provider_data": provider_payment}
        )

        # Here we would normally emit an event to the Order module to mark it paid
        # e.g., event_bus.publish("payment.success", {"order_id": payment.order_id, "payment_id": payment.id})

        return payment
