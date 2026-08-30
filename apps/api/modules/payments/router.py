from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Query, status
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
    """Webhook session: unauthenticated (payment provider server-to-server) but
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
    try:
        payment = await service.initiate_payment(payment_in=payment_in, current_user_id=str(current_user.id))
    except RuntimeError as exc:
        # Provider rejected the request (unconfigured/bad keys, outage) —
        # surface a truthful, retryable error instead of a raw 500.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment provider is not available. Please retry in a moment or choose Cash on Delivery.",
        ) from exc
    meta = payment.metadata_info or {}
    provider_name = service.provider.name  # "cashfree" | "easebuzz" | "mock"

    if provider_name == "easebuzz":
        checkout = {
            "provider": "easebuzz",
            "access_key": meta.get("access_key", ""),
            "checkout_url": meta.get("checkout_url", ""),
            "txnid": meta.get("txnid", ""),
            "provider_order_id": payment.provider_order_id,
            "amount": payment.amount,
            "currency": payment.currency,
        }
    else:
        # Cashfree / mock
        checkout = {
            "provider": provider_name,
            "client_id": settings.cashfree_client_id if provider_name == "cashfree" else "mock",
            "payment_session_id": meta.get("payment_session_id"),
            "environment": settings.cashfree_environment,
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
    """Verify the payment with the provider and capture.
    For Cashfree, this calls the Cashfree API to verify payment status.
    For other providers (mock), it verifies the signature."""
    return await service.verify_and_capture(
        payment_id=payment_id,
        provider_payment_id=verification_data.provider_payment_id,
        provider_signature=verification_data.provider_signature or "",
        provider_order_id=verification_data.provider_order_id,
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


@router.post("/webhook/cashfree")
async def cashfree_webhook(
    request: Request,
    x_webhook_signature: str = Header(..., alias="x-webhook-signature"),
    x_webhook_timestamp: str = Header(..., alias="x-webhook-timestamp"),
    service: PaymentService = Depends(get_webhook_payment_service),
):
    """Webhook endpoint for Cashfree payment events (source of truth for
    captures/failures). Signature-verified, idempotent by provider event id."""
    raw_payload = await request.body()
    return await service.handle_webhook(
        signature=x_webhook_signature,
        raw_payload=raw_payload,
        timestamp=x_webhook_timestamp,
        event_id=x_webhook_timestamp,
    )


@router.post("/easebuzz/return")
async def easebuzz_return(
    request: Request,
    service: PaymentService = Depends(get_webhook_payment_service),
):
    """EaseBuzz surl/furl callback endpoint.

    EaseBuzz POSTs form-encoded data here after the user completes payment.
    This is NOT the source of truth on its own — we verify the hash AND
    call the EaseBuzz status API before marking the order as paid.

    The endpoint always returns a 303 redirect to the storefront order page so
    the user's browser lands on a meaningful page regardless of outcome.
    """
    from fastapi.responses import RedirectResponse
    from core.config import settings as cfg
    from modules.payments.providers.easebuzz import EasebuzzProvider

    form = await request.form()
    callback_data = dict(form)

    logger.info(
        "EaseBuzz return callback: txnid=%s status=%s",
        callback_data.get("txnid", "?"),
        callback_data.get("status", "?"),
    )

    # Verify hash before trusting any field
    provider = service.provider
    if not isinstance(provider, EasebuzzProvider):
        logger.error("EaseBuzz return called but provider is not EaseBuzz: %s", provider.name)
        return RedirectResponse(
            url=f"{cfg.storefront_url}/account/orders?error=misconfigured",
            status_code=303,
        )

    hash_valid = provider.verify_callback_hash(callback_data)
    txnid = callback_data.get("txnid", "")
    eb_status = callback_data.get("status", "").upper()

    if not hash_valid:
        logger.error("EaseBuzz return: INVALID HASH for txnid=%s — rejected", txnid)
        return RedirectResponse(
            url=f"{cfg.storefront_url}/account/orders?payment=failed&reason=invalid_signature",
            status_code=303,
        )

    # Persist the callback via the webhook handler
    await service.handle_easebuzz_callback(
        txnid=txnid,
        status=eb_status,
        callback_data=callback_data,
    )

    if eb_status == "SUCCESS":
        return RedirectResponse(
            url=f"{cfg.storefront_url}/account/orders?payment=success",
            status_code=303,
        )
    else:
        # Redirect back to checkout so the user can easily retry
        return RedirectResponse(
            url=f"{cfg.storefront_url}/checkout?error=payment_cancelled",
            status_code=303,
        )


@router.post("/webhook/easebuzz")
async def easebuzz_webhook(
    request: Request,
    service: PaymentService = Depends(get_webhook_payment_service),
):
    """Background webhook endpoint for EaseBuzz transaction events.

    EaseBuzz may call this separately from the surl/furl redirect.
    This is signature-verified and idempotent.
    """
    from modules.payments.providers.easebuzz import EasebuzzProvider

    # EaseBuzz webhooks can be form-encoded or JSON
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        callback_data = await request.json()
    else:
        form = await request.form()
        callback_data = dict(form)

    provider = service.provider
    if isinstance(provider, EasebuzzProvider):
        hash_valid = provider.verify_callback_hash(callback_data)
        if not hash_valid:
            logger.warning("EaseBuzz webhook: invalid hash — rejected")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        logger.warning("EaseBuzz webhook called but active provider is %s", service.provider.name)

    txnid = callback_data.get("txnid", "")
    eb_status = callback_data.get("status", "").upper()

    result = await service.handle_easebuzz_callback(
        txnid=txnid,
        status=eb_status,
        callback_data=callback_data,
    )
    return {"status": "ok", "handled": result}

