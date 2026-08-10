from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.payments.models import Payment, PaymentEvent, PaymentStatus
from modules.payments.schemas import PaymentCreate


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, payment_id: str) -> Optional[Payment]:
        stmt = (
            select(Payment)
            .options(selectinload(Payment.events))
            .execution_options(populate_existing=True)
            .where(Payment.id == str(payment_id))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_order_id(self, order_id: str) -> Optional[Payment]:
        stmt = (
            select(Payment)
            .options(selectinload(Payment.events))
            .execution_options(populate_existing=True)
            .where(Payment.order_id == str(order_id))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_provider_payment_id(self, provider_payment_id: str) -> Optional[Payment]:
        stmt = (
            select(Payment)
            .options(selectinload(Payment.events))
            .execution_options(populate_existing=True)
            .where(Payment.provider_payment_id == provider_payment_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Optional[Payment]:
        stmt = (
            select(Payment)
            .options(selectinload(Payment.events))
            .execution_options(populate_existing=True)
            .where(Payment.idempotency_key == idempotency_key)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_payments(
        self,
        order_id: Optional[str] = None,
        status: Optional[PaymentStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Payment], int]:
        stmt = select(Payment).options(selectinload(Payment.events)).execution_options(populate_existing=True)

        if order_id:
            stmt = stmt.where(Payment.order_id == order_id)
        if status:
            stmt = stmt.where(Payment.status == status)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Pagination & Ordering
        stmt = stmt.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(
        self,
        payment_in: PaymentCreate,
        business_id: str,
        user_id: str,
        provider_order_id: Optional[str] = None,
    ) -> Payment:
        db_payment = Payment(
            business_id=business_id,
            order_id=str(payment_in.order_id),
            user_id=str(user_id),
            amount=payment_in.amount,
            currency=payment_in.currency,
            provider=payment_in.provider,
            idempotency_key=payment_in.idempotency_key,
            metadata_info=payment_in.metadata,
            provider_order_id=provider_order_id,
            status=PaymentStatus.PENDING,
        )
        self.db.add(db_payment)
        await self.db.flush()
        return db_payment

    async def update_status(
        self, payment_id: str, status: PaymentStatus, provider_payment_id: Optional[str] = None
    ) -> Optional[Payment]:
        stmt = select(Payment).where(Payment.id == payment_id)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()

        if payment:
            payment.status = status
            if provider_payment_id:
                payment.provider_payment_id = provider_payment_id
            await self.db.flush()

        return payment

    async def log_event(
        self, payment_id: str, event_type: str, payload: dict
    ) -> PaymentEvent:
        event = PaymentEvent(
            payment_id=payment_id,
            event_type=event_type,
            payload=payload,
        )
        self.db.add(event)
        await self.db.flush()
        return event
