from typing import Optional
from fastapi import APIRouter, Depends, Header, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.dependencies import set_db_context, require_roles
from modules.payments.models import PaymentStatus
from modules.payments.schemas import (
    PaymentCreate,
    PaymentResponse,
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


@router.post(
    "/initiate",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def initiate_payment(
    payment_in: PaymentCreate,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Initiate a payment for an order.
    """
    return await service.initiate_payment(payment_in=payment_in)


@router.post(
    "/{payment_id}/verify-success",
    response_model=PaymentResponse,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def verify_payment_success(
    payment_id: str,
    verification_data: PaymentSuccessVerification,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Verify payment signature and mark payment CAPTURED.
    """
    return await service.verify_and_capture(
        payment_id=payment_id,
        provider_payment_id=verification_data.provider_payment_id,
        provider_signature=verification_data.provider_signature,
    )


@router.post(
    "/{payment_id}/refund",
    response_model=PaymentResponse,
    dependencies=[Depends(require_roles(["owner", "platform_admin"]))]
)
async def refund_payment(
    payment_id: str,
    refund_data: PaymentRefundRequest,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Issue a full or partial refund for a captured payment.
    """
    return await service.refund_payment(
        payment_id=payment_id,
        refund_amount=refund_data.amount,
        reason=refund_data.reason,
    )


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def get_payment(
    payment_id: str,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Get payment details by ID.
    """
    return await service.get_payment(payment_id=payment_id)


@router.get(
    "/",
    response_model=PaginatedPaymentsResponse,
    dependencies=[Depends(require_roles(["owner", "staff", "platform_admin"]))]
)
async def list_payments(
    order_id: Optional[str] = Query(None, description="Filter by order ID"),
    status: Optional[PaymentStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: PaymentService = Depends(get_payment_service),
):
    """
    List payments with optional filtering and pagination.
    """
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
    service: PaymentService = Depends(get_payment_service),
):
    """
    Webhook endpoint for Razorpay payment events.
    """
    raw_payload = await request.body()
    return await service.handle_webhook(
        signature=x_razorpay_signature, raw_payload=raw_payload
    )
