from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

# Assuming auth dependency exists, using placeholder
from ...core.auth import get_current_user_id
from ...core.database import get_db
from .schemas import PaymentCreate, PaymentResponse
from .service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


def get_payment_service(db: Session = Depends(get_db)):
    return PaymentService(db)


@router.post("/initiate", response_model=PaymentResponse)
async def initiate_payment(
    payment_in: PaymentCreate,
    user_id: UUID = Depends(get_current_user_id),
    service: PaymentService = Depends(get_payment_service),
):
    return await service.initiate_payment(payment_in, user_id)


@router.post("/{payment_id}/verify")
async def verify_payment(
    payment_id: UUID,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user_id: UUID = Depends(get_current_user_id),
    service: PaymentService = Depends(get_payment_service),
):
    return await service.process_payment_success(
        payment_id, razorpay_payment_id, razorpay_signature
    )


@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    service: PaymentService = Depends(get_payment_service),
):
    raw_payload = await request.body()
    return await service.handle_webhook(x_razorpay_signature, raw_payload)
