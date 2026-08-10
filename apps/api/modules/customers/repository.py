from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from modules.customers.models import Customer


class CustomerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, customer: Customer) -> Customer:
        self.session.add(customer)
        await self.session.flush()
        return customer

    async def get_by_id(self, customer_id: str) -> Optional[Customer]:
        stmt = select(Customer).where(
            Customer.id == customer_id,
            Customer.deleted_at.is_(None)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str, business_id: str) -> Optional[Customer]:
        """Check for duplicate email within a business. Excludes soft-deleted."""
        stmt = select(Customer).where(
            Customer.email == email,
            Customer.business_id == business_id,
            Customer.deleted_at.is_(None)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_customers(
        self,
        offset: int = 0,
        limit: int = 20,
        search: str | None = None
    ) -> tuple[list[Customer], int]:
        base_filter = Customer.deleted_at.is_(None)

        if search:
            search_filter = or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%"),
            )
            where_clause = (base_filter, search_filter)
        else:
            where_clause = (base_filter,)

        stmt = (
            select(Customer)
            .where(*where_clause)
            .order_by(Customer.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        count_stmt = select(func.count()).select_from(Customer).where(*where_clause)
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0

        return items, total

    async def update(self, customer: Customer) -> Customer:
        self.session.add(customer)
        await self.session.flush()
        return customer

    async def soft_delete(self, customer: Customer) -> None:
        customer.deleted_at = datetime.now(timezone.utc)
        self.session.add(customer)
        await self.session.flush()
