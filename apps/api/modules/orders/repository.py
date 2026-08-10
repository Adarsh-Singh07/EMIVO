from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.orders.models import Order, OrderStatus


class OrderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, order: Order) -> Order:
        self.session.add(order)
        await self.session.flush()
        return order

    async def get_by_id(self, order_id: str) -> Optional[Order]:
        stmt = (
            select(Order)
            .where(
                Order.id == str(order_id),
                Order.deleted_at.is_(None)
            )
            .options(selectinload(Order.items))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Optional[Order]:
        stmt = (
            select(Order)
            .where(
                Order.idempotency_key == idempotency_key,
                Order.deleted_at.is_(None)
            )
            .options(selectinload(Order.items))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        status: Optional[OrderStatus] = None,
        customer_id: Optional[str] = None,
        user_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Order], int]:
        stmt = select(Order).where(Order.deleted_at.is_(None))

        if status:
            stmt = stmt.where(Order.status == status)

        if customer_id:
            stmt = stmt.where(Order.customer_id == customer_id)

        if user_id:
            stmt = stmt.where(Order.user_id == user_id)

        # Count query
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0


        # Pagination & eager loading
        offset = (page - 1) * page_size
        paginated_stmt = (
            stmt.order_by(Order.created_at.desc())
            .offset(offset)
            .limit(page_size)
            .options(selectinload(Order.items))
        )

        result = await self.session.execute(paginated_stmt)
        orders = list(result.scalars().all())

        return orders, total

    async def update(self, order: Order) -> Order:
        self.session.add(order)
        await self.session.flush()
        return order
