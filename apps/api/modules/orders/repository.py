from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import tenant_context
from modules.orders.models import Order, OutboxEvent


class OrderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self, order: Order, outbox_event: OutboxEvent | None = None
    ) -> Order:
        self.session.add(order)
        if outbox_event:
            self.session.add(outbox_event)
        await self.session.commit()
        await self.session.refresh(order)
        # Load items explicitly
        result = await self.session.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
        )
        return result.scalar_one()

    async def get_by_id(self, order_id: str) -> Order | None:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id, Order.deleted_at.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Order | None:
        business_id = tenant_context.get()
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(
                Order.idempotency_key == idempotency_key,
                Order.business_id == business_id,
                Order.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(
        self, user_id: str, limit: int = 20, offset: int = 0
    ) -> list[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.user_id == user_id, Order.deleted_at.is_(None))
            .order_by(Order.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self, order: Order, outbox_event: OutboxEvent | None = None
    ) -> Order:
        if outbox_event:
            self.session.add(outbox_event)
        await self.session.commit()
        await self.session.refresh(order)
        return order
