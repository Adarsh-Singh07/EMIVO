from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from core.exceptions import DomainException
from modules.customers.models import Customer
from modules.customers.repository import CustomerRepository
from modules.customers.schemas import CustomerCreate, CustomerUpdate


class CustomerService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = CustomerRepository(session)

    async def _get_current_business_id(self) -> str:
        """Read business context from the RLS session variable set by set_db_context."""
        bus_query = text("SELECT NULLIF(current_setting('app.business_id', true), '')::text AS business_id")
        bus_res = await self.session.execute(bus_query)
        current_b_id = bus_res.scalar()
        if not current_b_id:
            raise DomainException(
                "No business context found. Ensure you are authenticated with a business membership.",
                code="FORBIDDEN",
                status_code=403
            )
        return str(current_b_id)

    async def create_customer(self, data: CustomerCreate) -> Customer:
        business_id = await self._get_current_business_id()

        existing = await self.repository.get_by_email(data.email, business_id)
        if existing:
            raise DomainException(
                f"A customer with email '{data.email}' already exists in this business",
                code="ALREADY_EXISTS",
                status_code=409
            )

        customer = Customer(
            business_id=business_id,
            name=data.name,
            email=data.email,
            phone=data.phone,
            address=data.address,
            notes=data.notes,
        )

        await self.repository.create(customer)
        await self.session.commit()
        await self.session.refresh(customer)
        return customer

    async def list_customers(
        self,
        page: int,
        page_size: int,
        search: str | None = None
    ) -> tuple[list[Customer], int]:
        offset = (page - 1) * page_size
        # RLS at the DB level filters by business_id automatically
        return await self.repository.list_customers(offset=offset, limit=page_size, search=search)

    async def get_customer(self, customer_id: str) -> Customer:
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise DomainException("Customer not found", code="NOT_FOUND", status_code=404)
        return customer

    async def update_customer(self, customer_id: str, data: CustomerUpdate) -> Customer:
        customer = await self.get_customer(customer_id)

        if data.name is not None:
            customer.name = data.name

        if data.email is not None and data.email != customer.email:
            existing = await self.repository.get_by_email(data.email, customer.business_id)
            if existing:
                raise DomainException(
                    f"A customer with email '{data.email}' already exists in this business",
                    code="ALREADY_EXISTS",
                    status_code=409
                )
            customer.email = data.email

        if data.phone is not None:
            customer.phone = data.phone
        if data.address is not None:
            customer.address = data.address
        if data.notes is not None:
            customer.notes = data.notes

        await self.repository.update(customer)
        await self.session.commit()
        await self.session.refresh(customer)
        return customer

    async def delete_customer(self, customer_id: str) -> None:
        """Soft-delete: sets deleted_at timestamp. Customer is invisible via RLS after this."""
        customer = await self.get_customer(customer_id)
        await self.repository.soft_delete(customer)
        await self.session.commit()
