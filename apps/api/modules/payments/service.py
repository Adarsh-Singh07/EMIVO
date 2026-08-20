"""Payment service — provider-agnostic money handling.

Guarantees:
  - amount is ALWAYS taken from the local order (client-supplied amounts are
    rejected if they mismatch); totals are computed by checkout, never trusted.
  - provider selection via PAYMENT_PROVIDER env (cashfree | mock); mock is
    only usable outside prod.
  - webhook is the source of truth; the client verify endpoint applies the
    same idempotent transition.
  - captures commit reserved inventory and enqueue notifications; failures
    release reservations.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import DomainException
from core.models import OutboxEvent
from modules.inventory.service import InventoryService
from modules.orders.models import Order, OrderStatus
from modules.orders.repository import OrderRepository
from modules.payments.models import Payment, PaymentStatus, PaymentProvider
from modules.payments.providers.base import BasePaymentProvider
from modules.payments.providers.cashfree import CashfreeProvider
from modules.payments.providers.mock import MockProvider
from modules.payments.repository import PaymentRepository
from modules.payments.schemas import PaymentCreate, PaymentResponse, PaginatedPaymentsResponse

logger = logging.getLogger(__name__)


def get_provider() -> BasePaymentProvider:
    """Select the payment provider from configuration. Production must be
    explicit: 'mock' is refused when ENV_NAME=prod."""
    chosen = (settings.payment_provider or "mock").lower()
    if chosen == "cashfree":
        return CashfreeProvider(
            client_id=settings.cashfree_client_id,
            client_secret=settings.cashfree_client_secret.get_secret_value(),
            environment=settings.cashfree_environment,
        )
    if chosen == "mock":
        if settings.is_prod:
            raise RuntimeError("PAYMENT_PROVIDER=mock is not allowed in production")
        return MockProvider()
    raise RuntimeError(f"Unknown PAYMENT_PROVIDER: {chosen}")


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = PaymentRepository(db)
        self.order_repository = OrderRepository(db)
        self.inventory = InventoryService(db)
        self.provider = get_provider()

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

    # ------------------------------------------------------------------ #
    # Initiation                                                          #
    # ------------------------------------------------------------------ #

    async def initiate_payment(self, payment_in: PaymentCreate, current_user_id: Optional[str] = None) -> Payment:
        business_id = await self._get_current_business_id()
        user_id = current_user_id or await self._get_current_user_id() or "system"

        # 1. Idempotency
        existing = await self.repository.get_by_idempotency_key(payment_in.idempotency_key)
        if existing:
            return existing

        # 2. Order must exist, belong to this tenant, be awaiting payment,
        #    and belong to the requesting customer.
        order = await self.order_repository.get_by_id(payment_in.order_id)
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)
        if order.status != OrderStatus.PENDING:
            raise DomainException(
                f"Order is not awaiting payment (status={order.status.value})",
                code="BAD_REQUEST", status_code=400,
            )
        if user_id != "system" and str(order.user_id) != str(user_id):
            raise DomainException("Not your order", code="FORBIDDEN", status_code=403)

        # 3. Amount integrity: server-side total wins, always.
        if payment_in.amount is not None and payment_in.amount != order.total:
            raise DomainException(
                f"Payment amount mismatch: order total is {order.total} paise",
                code="AMOUNT_MISMATCH", status_code=400,
            )
        if payment_in.amount is None:
            payment_in = payment_in.model_copy(update={"amount": order.total})
        if payment_in.provider == PaymentProvider.MOCK and self.provider.name == "cashfree":
            payment_in = payment_in.model_copy(update={"provider": PaymentProvider.CASHFREE})

        # 4. Provider order (external call — runs on its own, no DB locks held)
        notes = (payment_in.metadata or {}) | {
            "order_id": str(payment_in.order_id),
            "order_number": order.order_number or "",
            "business_id": business_id,
        }
        provider_order = await self.provider.create_order(
            amount=order.total,
            currency=payment_in.currency or order.currency,
            receipt=str(payment_in.order_id),
            notes=notes,
        )
        if not provider_order or "id" not in provider_order:
            raise DomainException(
                "Failed to create order with payment provider",
                code="PAYMENT_FAILED", status_code=502,
            )

        meta = payment_in.metadata or {}
        if "payment_session_id" in provider_order:
            meta["payment_session_id"] = provider_order["payment_session_id"]

        # 5. Local payment record
        payment = await self.repository.create(
            payment_in=payment_in.model_copy(update={"metadata": meta}),
            business_id=business_id,
            user_id=str(order.user_id),
            provider_order_id=provider_order["id"],
        )
        await self.repository.log_event(
            payment_id=payment.id,
            event_type="payment_initiated",
            payload={"provider_order_id": provider_order["id"], "amount": order.total},
        )
        await self.db.commit()
        return await self.repository.get_by_id(payment.id)

    # ------------------------------------------------------------------ #
    # Capture (client verify) — idempotent, same logic as the webhook      #
    # ------------------------------------------------------------------ #

    async def verify_and_capture(
        self,
        payment_id: str,
        provider_payment_id: str,
        provider_signature: str = "",
        provider_order_id: str | None = None,
    ) -> Payment:
        payment = await self.repository.get_by_id(payment_id)
        if not payment:
            raise DomainException("Payment not found", code="NOT_FOUND", status_code=404)
        if payment.status == PaymentStatus.SUCCESS:
            return payment
        if payment.status not in (PaymentStatus.CREATED, PaymentStatus.PENDING):
            raise DomainException(
                f"Payment already {payment.status.value}", code="BAD_REQUEST", status_code=400
            )

        # Ownership: customers may only verify their own payments
        current_user = await self._get_current_user_id()
        if current_user and str(payment.user_id) != current_user:
            is_staff = await self._is_staff()
            if not is_staff:
                raise DomainException("Not your payment", code="FORBIDDEN", status_code=403)

        # Provider-specific verification
        if self.provider.name == "cashfree":
            # For Cashfree, verify by fetching payment status from Cashfree API
            # using the Cashfree order ID (from provider_order_id or stored in payment)
            cf_order_id = provider_order_id or payment.provider_order_id
            if not cf_order_id:
                raise DomainException("Missing provider order ID", code="BAD_REQUEST", status_code=400)
            
            cf_payment = await self.provider.verify_payment_by_order(cf_order_id)
            if not cf_payment:
                raise DomainException("Could not verify payment with Cashfree", code="PAYMENT_FAILED", status_code=502)
            
            payment_status = cf_payment.get("payment_status")
            if payment_status != "SUCCESS":
                await self._fail(payment, cf_payment.get("payment_message") or "payment_failed", cf_payment.get("cf_payment_id", ""))
                raise DomainException(f"Payment not successful: {payment_status}", code="BAD_REQUEST", status_code=400)
            
            provider_payment_id = cf_payment.get("cf_payment_id", provider_payment_id)
        else:
            # Signature verification for mock/legacy providers
            payload = f"{payment.provider_order_id}|{provider_payment_id}"
            is_valid = await self.provider.verify_signature(payload, provider_signature)
            if not is_valid:
                await self.repository.update_status(payment_id, PaymentStatus.FAILED, provider_payment_id)
                await self.repository.log_event(
                    payment_id, "signature_verification_failed",
                    {"provider_payment_id": provider_payment_id},
                )
                order = await self.order_repository.get_by_id(payment.order_id)
                if order:
                    await self.inventory.release_for_order(order)
                await self.db.commit()
                raise DomainException(
                    "Payment signature verification failed", code="BAD_REQUEST", status_code=400
                )

        return await self._capture(payment, provider_payment_id, source="client_verify")

    async def _is_staff(self) -> bool:
        res = await self.db.execute(
            text("SELECT NULLIF(current_setting('app.role', true), '')")
        )
        return res.scalar() in ("staff", "owner", "platform_admin")

    async def _capture(self, payment: Payment, provider_payment_id: str, source: str) -> Payment:
        """Idempotent capture transition: payment CAPTURED, order CONFIRMED,
        reserved stock committed, notification enqueued."""
        fresh = await self.repository.get_by_id(payment.id)
        if fresh.status == PaymentStatus.SUCCESS:
            return fresh

        await self.repository.update_status(
            payment_id=payment.id,
            status=PaymentStatus.SUCCESS,
            provider_payment_id=provider_payment_id,
        )
        await self.repository.log_event(
            payment_id=payment.id,
            event_type="payment_captured",
            payload={"provider_payment_id": provider_payment_id, "source": source},
        )

        order = await self.order_repository.get_by_id(payment.order_id)
        if order and order.status == OrderStatus.PENDING:
            order.status = OrderStatus.CONFIRMED
            await self.order_repository.update(order)
            await self.inventory.commit_for_order(order)
            self.db.add(OutboxEvent(
                tenant_id=order.business_id,
                type="payment.captured",
                payload={
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "user_id": str(order.user_id),
                    "payment_id": str(payment.id),
                    "amount": payment.amount,
                },
            ))

        await self.db.commit()
        return await self.repository.get_by_id(payment.id)

    async def _fail(self, payment: Payment, reason: str, provider_payment_id: Optional[str] = None) -> Payment:
        fresh = await self.repository.get_by_id(payment.id)
        if fresh.status not in (PaymentStatus.CREATED, PaymentStatus.PENDING):
            return fresh

        await self.repository.update_status(payment.id, PaymentStatus.FAILED, provider_payment_id)
        await self.repository.log_event(
            payment.id, "payment_failed", {"reason": reason},
        )
        order = await self.order_repository.get_by_id(payment.order_id)
        if order and order.status == OrderStatus.PENDING:
            order.status = OrderStatus.CANCELLED
            order.notes = (order.notes or "") + f"\n[payment failed: {reason}]".strip()
            await self.order_repository.update(order)
            await self.inventory.release_for_order(order)
            self.db.add(OutboxEvent(
                tenant_id=order.business_id,
                type="payment.failed",
                payload={
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "user_id": str(order.user_id),
                    "reason": reason,
                },
            ))
        await self.db.commit()
        return await self.repository.get_by_id(payment.id)

    # ------------------------------------------------------------------ #
    # Refunds (staff)                                                     #
    # ------------------------------------------------------------------ #

    async def refund_payment(
        self,
        payment_id: str,
        refund_amount: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> Payment:
        payment = await self.repository.get_by_id(payment_id)
        if not payment:
            raise DomainException("Payment not found", code="NOT_FOUND", status_code=404)
        if payment.status != PaymentStatus.SUCCESS:
            raise DomainException(
                f"Cannot refund payment in status {payment.status.value}. Only CAPTURED payments can be refunded.",
                code="BAD_REQUEST", status_code=400,
            )
        if refund_amount and refund_amount > payment.amount:
            raise DomainException("Refund exceeds payment amount", code="BAD_REQUEST", status_code=400)

        order = await self.order_repository.get_by_id(payment.order_id)

        # Provider-side refund first; only then mutate local state.
        # Cashfree requires the order id (provider_order_id), not the payment id.
        if payment.provider_payment_id:
            provider_refund = await self.provider.refund(
                payment.provider_payment_id,
                amount=refund_amount,
                provider_order_id=payment.provider_order_id,
            )
            refund_id = provider_refund.get("id") or provider_refund.get("refund_id")
        else:
            refund_id = None

        await self.repository.update_status(payment_id, PaymentStatus.REFUNDED)
        await self.repository.log_event(
            payment_id=payment_id,
            event_type="payment_refunded",
            payload={
                "refund_amount": refund_amount or payment.amount,
                "reason": reason,
                "provider_refund_id": refund_id,
            },
        )

        if order:
            order.status = OrderStatus.REFUNDED
            await self.order_repository.update(order)
            # Full refunds restock committed units
            if order.stock_committed:
                await self.inventory.restock_for_order(order)
            self.db.add(OutboxEvent(
                tenant_id=order.business_id,
                type="order.refunded",
                payload={
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "user_id": str(order.user_id),
                    "refund_amount": refund_amount or payment.amount,
                    "reason": reason,
                },
            ))

        await self.db.commit()
        return await self.repository.get_by_id(payment_id)

    # ------------------------------------------------------------------ #
    # Reads                                                               #
    # ------------------------------------------------------------------ #

    async def get_payment(self, payment_id: str) -> Payment:
        payment = await self.repository.get_by_id(payment_id)
        if not payment:
            raise DomainException("Payment not found", code="NOT_FOUND", status_code=404)
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
            items=items, total=total, page=page, page_size=page_size,
            has_next=has_next, has_prev=has_prev,
        )

    # ------------------------------------------------------------------ #
    # Webhook (source of truth)                                           #
    # ------------------------------------------------------------------ #

    async def handle_webhook(
        self,
        signature: str,
        raw_payload: bytes,
        timestamp: str,
        event_id: Optional[str] = None,
    ) -> dict:
        payload_str = raw_payload.decode("utf-8", errors="replace")
        payload_to_verify = timestamp + payload_str

        # Provider-specific webhook secret. Cashfree uses a dedicated webhook
        # secret; mock accepts any signature matching "valid_mock_signature".
        if self.provider.name == "cashfree":
            webhook_secret = settings.cashfree_webhook_secret.get_secret_value()
            if not webhook_secret:
                raise DomainException("Payment provider not configured", code="PAYMENT_FAILED")
        else:
            webhook_secret = None

        is_valid = await self.provider.verify_signature(payload_to_verify, signature, webhook_secret)
        if not is_valid:
            raise DomainException("Invalid webhook signature", code="BAD_REQUEST", status_code=400)

        payload = json.loads(payload_str)
        event_name = payload.get("type", "")
        entity = payload.get("data", {})

        # Idempotency: same provider event delivered twice must no-op.
        if event_id:
            from core.redis import redis_manager

            dedup_key = f"webhook:seen:{event_id}"
            first_time = await redis_manager.client.set(dedup_key, event_name, nx=True, ex=7 * 24 * 3600)
            if not first_time:
                return {"status": "duplicate_ignored", "event": event_name}

        handled = None
        try:
            if event_name == "PAYMENT_SUCCESS_WEBHOOK":
                handled = await self._webhook_payment_captured(entity)
            elif event_name == "PAYMENT_FAILED_WEBHOOK":
                handled = await self._webhook_payment_failed(entity)
            elif event_name in ("REFUND_PROCESSED_WEBHOOK"):
                handled = {"refund": True}
            else:
                handled = {"ignored": True}
        except DomainException as exc:
            # Log but 200 — payment provider retries on non-2xx and we may just not
            # have the payment locally yet (race with initiate).
            logger.warning("webhook %s handling issue: %s", event_name, exc.message)

        return {"status": "success", "event": event_name, "handled": handled}

    async def _find_payment_by_entity(self, entity: dict) -> Optional[Payment]:
        pay_entity = entity.get("payment") or {}
        order_entity = entity.get("order") or {}
        provider_order_id = order_entity.get("order_id")
        provider_payment_id = str(pay_entity.get("cf_payment_id")) if pay_entity.get("cf_payment_id") else None

        if provider_payment_id:
            res = await self.db.execute(
                text("SELECT * FROM payments WHERE provider_payment_id = :ppid LIMIT 1"),
                {"ppid": provider_payment_id},
            )
            row = res.mappings().first()
            if row:
                return await self.repository.get_by_id(row["id"])
        if provider_order_id:
            res = await self.db.execute(
                text("SELECT * FROM payments WHERE provider_order_id = :poid ORDER BY created_at DESC LIMIT 1"),
                {"poid": provider_order_id},
            )
            row = res.mappings().first()
            if row:
                return await self.repository.get_by_id(row["id"])
        return None

    async def _webhook_payment_captured(self, entity: dict) -> dict:
        payment = await self._find_payment_by_entity(entity)
        if not payment:
            return {"payment_not_found": True}
        pay_entity = entity.get("payment") or {}

        # Amount integrity from the provider itself
        provider_amount = pay_entity.get("payment_amount")
        # Cashfree returns amount in major units, so we convert to paise
        if provider_amount is not None and int(float(provider_amount) * 100) != payment.amount:
            await self.repository.log_event(
                payment.id, "webhook_amount_mismatch",
                {"provider_amount": provider_amount, "local_amount": payment.amount},
            )
            await self.db.commit()
            logger.error("webhook amount mismatch payment=%s", payment.id)
            return {"amount_mismatch": True}

        await self._capture(payment, str(pay_entity.get("cf_payment_id", "")), source="webhook")
        return {"captured": True}

    async def _webhook_payment_failed(self, entity: dict) -> dict:
        payment = await self._find_payment_by_entity(entity)
        if not payment:
            return {"payment_not_found": True}
        pay_entity = entity.get("payment") or {}
        reason = pay_entity.get("payment_message") or "payment.failed"
        await self._fail(payment, reason, str(pay_entity.get("cf_payment_id", "")))
        return {"failed": True}
