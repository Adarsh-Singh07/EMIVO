from typing import Optional

from fastapi import APIRouter, Depends, Header, Request, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db_session
from core.dependencies import set_db_context, require_staff, get_current_user
from core.store import get_store_business_id
from modules.users.models import User
from modules.payments.models import PaymentStatus
from modules.payments.schemas import (
    PaymentCreate,
    PaymentResponse,
    PaymentInitiationResponse,
    PaginatedPaymentsResponse,
    PaymentSuccessVerification,
    PaymentRefundRequest,
)
from modules.payments.service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


async def get_payment_service(
    db: AsyncSession = Depends(set_db_context)
) -> PaymentService:
    return PaymentService(db)


async def get_webhook_payment_service(
    db: AsyncSession = Depends(get_db_session),
) -> PaymentService:
    """Webhook session: unauthenticated (Razorpay server-to-server) but
    signature-verified, so it operates with staff scope on the store tenant —
    this is what lets the capture path update orders + inventory under RLS."""
    store_id = await get_store_business_id(db)
    await db.execute(text("SELECT set_config('app.business_id', :bid, true)"), {"bid": store_id})
    await db.execute(text("SELECT set_config('app.role', 'platform_admin', true)"))
    return PaymentService(db)


@router.post(
    "/initiate",
    response_model=PaymentInitiationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def initiate_payment(
    payment_in: PaymentCreate,
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(get_current_user),
):
    """Create a provider payment order for an order awaiting payment.
    Customers may only initiate payments for their own orders."""
    payment = await service.initiate_payment(payment_in=payment_in, current_user_id=str(current_user.id))
    checkout = {
        "key_id": settings.razorpay_key_id if service.provider.name == "razorpay" else "mock",
        "provider_order_id": payment.provider_order_id,
        "amount": payment.amount,
        "currency": payment.currency,
        "name": "ELEKTRIX",
        "description": f"Order {getattr(payment, 'order_id', '')[:8]}",
    }
    return PaymentInitiationResponse(
        payment=PaymentResponse.model_validate(payment),
        provider=service.provider.name,
        checkout=checkout,
    )


@router.post(
    "/{payment_id}/verify-success",
    response_model=PaymentResponse,
)
async def verify_payment_success(
    payment_id: str,
    verification_data: PaymentSuccessVerification,
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(get_current_user),
):
    """Verify the provider signature (Razorpay Checkout callback) and capture.
    Ownership enforced in the service; the webhook applies the same idempotent
    transition server-side."""
    return await service.verify_and_capture(
        payment_id=payment_id,
        provider_payment_id=verification_data.provider_payment_id,
        provider_signature=verification_data.provider_signature,
    )


@router.post(
    "/{payment_id}/refund",
    response_model=PaymentResponse,
    dependencies=[Depends(require_staff)],
)
async def refund_payment(
    payment_id: str,
    refund_data: PaymentRefundRequest,
    service: PaymentService = Depends(get_payment_service),
):
    """Issue a full or partial refund (staff only). Refunds execute at the
    provider first, then update local state and restock committed inventory."""
    return await service.refund_payment(
        payment_id=payment_id,
        refund_amount=refund_data.amount,
        reason=refund_data.reason,
    )


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
    dependencies=[Depends(require_staff)],
)
async def get_payment(
    payment_id: str,
    service: PaymentService = Depends(get_payment_service),
):
    """Get payment details by ID (staff)."""
    return await service.get_payment(payment_id=payment_id)


@router.get(
    "",
    response_model=PaginatedPaymentsResponse,
    dependencies=[Depends(require_staff)],
)
async def list_payments(
    order_id: Optional[str] = Query(None, description="Filter by order ID"),
    status: Optional[PaymentStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: PaymentService = Depends(get_payment_service),
):
    """List payments with optional filtering and pagination (staff)."""
    return await service.list_payments(
        order_id=order_id,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(..., alias="X-Razorpay-Signature"),
    x_razorpay_event_id: Optional[str] = Header(default=None, alias="X-Razorpay-Event-Id"),
    service: PaymentService = Depends(get_webhook_payment_service),
):
    """Webhook endpoint for Razorpay payment events (source of truth for
    captures/failures). Signature-verified, idempotent by provider event id."""
    raw_payload = await request.body()
    return await service.handle_webhook(
        signature=x_razorpay_signature,
        raw_payload=raw_payload,
        event_id=x_razorpay_event_id,
    )
