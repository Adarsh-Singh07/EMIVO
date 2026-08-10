import json
import logging
import os
from typing import Optional, Tuple, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.orders.models import OrderStatus
from modules.orders.repository import OrderRepository
from modules.payments.models import Payment, PaymentStatus, PaymentProvider
from modules.payments.providers.razorpay import RazorpayMockProvider
from modules.payments.repository import PaymentRepository
from modules.payments.schemas import PaymentCreate, PaymentResponse, PaginatedPaymentsResponse

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = PaymentRepository(db)
        self.order_repository = OrderRepository(db)
        self.provider = RazorpayMockProvider(
            api_key=os.getenv("RAZORPAY_KEY_ID", "mock_key"),
            api_secret=os.getenv("RAZORPAY_KEY_SECRET", "mock_secret"),
        )

    async def _get_current_business_id(self) -> str:
        res = await self.db.execute(
            text("SELECT NULLIF(current_setting('app.business_id', true), '')")
        )
        current_b_id = res.scalar()
        if not current_b_id:
            raise DomainException(
                "Tenant context missing or invalid",
                code="UNAUTHORIZED",
                status_code=401
            )
        return str(current_b_id)

    async def _get_current_user_id(self) -> Optional[str]:
        res = await self.db.execute(
            text("SELECT NULLIF(current_setting('app.user_id', true), '')")
        )
        user_id = res.scalar()
        return str(user_id) if user_id else None

    async def initiate_payment(self, payment_in: PaymentCreate) -> Payment:
        business_id = await self._get_current_business_id()
        user_id = await self._get_current_user_id() or "system"

        # 1. Idempotency Check
        existing = await self.repository.get_by_idempotency_key(payment_in.idempotency_key)
        if existing:
            return existing

        # 2. Verify Order Exists & Check Amount
        order = await self.order_repository.get_by_id(payment_in.order_id)
        if not order:
            raise DomainException(
                "Order not found",
                code="NOT_FOUND",
                status_code=404
            )

        # 3. Call Provider Adapter
        notes = payment_in.metadata or {}
        notes["order_id"] = str(payment_in.order_id)
        notes["business_id"] = business_id

        provider_order = await self.provider.create_order(
            amount=payment_in.amount,
            currency=payment_in.currency,
            receipt=str(payment_in.order_id),
            notes=notes,
        )

        if not provider_order or "id" not in provider_order:
            raise DomainException(
                "Failed to create order with payment provider",
                code="PAYMENT_FAILED",
                status_code=500
            )

        # 4. Create Local Payment Record
        payment = await self.repository.create(
            payment_in=payment_in,
            business_id=business_id,
            user_id=user_id,
            provider_order_id=provider_order["id"],
        )

        await self.repository.log_event(
            payment_id=payment.id,
            event_type="payment_initiated",
            payload={"provider_order_id": provider_order["id"]}
        )

        await self.db.commit()
        return await self.repository.get_by_id(payment.id)

    async def verify_and_capture(
        self,
        payment_id: str,
        provider_payment_id: str,
        provider_signature: str,
    ) -> Payment:
        payment = await self.repository.get_by_id(payment_id)
        if not payment:
            raise DomainException(
                "Payment not found",
                code="NOT_FOUND",
                status_code=404
            )

        if payment.status == PaymentStatus.CAPTURED:
            return payment

        # Signature verification
        payload = f"{payment.provider_order_id}|{provider_payment_id}"
        is_valid = await self.provider.verify_signature(payload, provider_signature)

        if not is_valid:
            await self.repository.update_status(payment_id, PaymentStatus.FAILED, provider_payment_id)
            await self.repository.log_event(
                payment_id,
                "signature_verification_failed",
                {"provider_payment_id": provider_payment_id}
            )
            await self.db.commit()
            raise DomainException(
                "Payment signature verification failed",
                code="BAD_REQUEST",
                status_code=400
            )

        # Mark captured
        await self.repository.update_status(
            payment_id=payment_id,
            status=PaymentStatus.CAPTURED,
            provider_payment_id=provider_payment_id,
        )
        await self.repository.log_event(
            payment_id=payment_id,
            event_type="payment_captured",
            payload={"provider_payment_id": provider_payment_id}
        )

        # Transition associated Order status to CONFIRMED
        order = await self.order_repository.get_by_id(payment.order_id)
        if order and order.status == OrderStatus.PENDING:
            order.status = OrderStatus.CONFIRMED
            await self.order_repository.update(order)

        await self.db.commit()
        return await self.repository.get_by_id(payment_id)

    async def refund_payment(
        self,
        payment_id: str,
        refund_amount: Optional[int] = None,
        reason: Optional[str] = None
    ) -> Payment:
        payment = await self.repository.get_by_id(payment_id)
        if not payment:
            raise DomainException(
                "Payment not found",
                code="NOT_FOUND",
                status_code=404
            )

        if payment.status != PaymentStatus.CAPTURED:
            raise DomainException(
                f"Cannot refund payment in status {payment.status}. Only CAPTURED payments can be refunded.",
                code="BAD_REQUEST",
                status_code=400
            )

        amount_to_refund = refund_amount or payment.amount

        # Update status
        await self.repository.update_status(payment_id, PaymentStatus.REFUNDED)
        await self.repository.log_event(
            payment_id=payment_id,
            event_type="payment_refunded",
            payload={"refund_amount": amount_to_refund, "reason": reason}
        )

        # Transition Order status to REFUNDED
        order = await self.order_repository.get_by_id(payment.order_id)
        if order:
            order.status = OrderStatus.REFUNDED
            await self.order_repository.update(order)

        await self.db.commit()
        return await self.repository.get_by_id(payment_id)

    async def get_payment(self, payment_id: str) -> Payment:
        payment = await self.repository.get_by_id(payment_id)
        if not payment:
            raise DomainException(
                "Payment not found",
                code="NOT_FOUND",
                status_code=404
            )
        return payment

    async def list_payments(
        self,
        order_id: Optional[str] = None,
        status: Optional[PaymentStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedPaymentsResponse:
        items, total = await self.repository.list_payments(
            order_id=order_id, status=status, page=page, page_size=page_size
        )
        has_next = (page * page_size) < total
        has_prev = page > 1

        return PaginatedPaymentsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_prev=has_prev
        )

    async def handle_webhook(self, signature: str, raw_payload: bytes) -> dict:
        payload_str = raw_payload.decode("utf-8")
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "mock_secret")

        is_valid = await self.provider.verify_signature(payload_str, signature, webhook_secret)
        if not is_valid:
            raise DomainException("Invalid webhook signature", code="BAD_REQUEST", status_code=400)

        payload = json.loads(payload_str)
        event_name = payload.get("event")

        return {"status": "success", "event": event_name}
