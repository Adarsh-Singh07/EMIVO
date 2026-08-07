from uuid import UUID

from sqlalchemy.orm import Session

from .models import Payment, PaymentEvent
from .schemas import PaymentCreate


class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, payment_id: UUID) -> Payment | None:
        return self.db.query(Payment).filter(Payment.id == payment_id).first()

    def get_by_provider_payment_id(self, provider_payment_id: str) -> Payment | None:
        return (
            self.db.query(Payment)
            .filter(Payment.provider_payment_id == provider_payment_id)
            .first()
        )

    def get_by_idempotency_key(self, idempotency_key: str) -> Payment | None:
        return (
            self.db.query(Payment)
            .filter(Payment.idempotency_key == idempotency_key)
            .first()
        )

    def create(
        self, payment_in: PaymentCreate, user_id: UUID, provider_order_id: str
    ) -> Payment:
        db_payment = Payment(
            order_id=payment_in.order_id,
            user_id=user_id,
            amount=payment_in.amount,
            currency=payment_in.currency,
            provider=payment_in.provider,
            idempotency_key=payment_in.idempotency_key,
            metadata=payment_in.metadata,
            provider_order_id=provider_order_id,
        )
        self.db.add(db_payment)
        self.db.commit()
        self.db.refresh(db_payment)
        return db_payment

    def update_status(
        self, payment_id: UUID, status: str, provider_payment_id: str = None
    ) -> Payment:
        payment = self.get_by_id(payment_id)
        if payment:
            payment.status = status
            if provider_payment_id:
                payment.provider_payment_id = provider_payment_id
            self.db.commit()
            self.db.refresh(payment)
        return payment

    def log_event(
        self, payment_id: UUID, event_type: str, payload: dict
    ) -> PaymentEvent:
        event = PaymentEvent(
            payment_id=payment_id, event_type=event_type, payload=payload
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event
