from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.addresses.models import Address
from modules.addresses.schemas import AddressCreate, AddressUpdate


class AddressService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_addresses(self, user_id: str) -> List[Address]:
        res = await self.session.execute(
            select(Address)
            .where(Address.user_id == user_id)
            .order_by(Address.is_default.desc(), Address.created_at.desc())
        )
        return list(res.scalars().all())

    async def create_address(self, user_id: str, data: AddressCreate) -> Address:
        # First address becomes the default automatically
        existing = await self.list_addresses(user_id)
        make_default = data.is_default or not existing

        if make_default and existing:
            await self.session.execute(
                update(Address).where(Address.user_id == user_id).values(is_default=False)
            )
        address = Address(user_id=user_id, **data.model_dump(), is_default=make_default)
        self.session.add(address)
        await self.session.commit()
        await self.session.refresh(address)
        return address

    async def _get_owned(self, user_id: str, address_id: str) -> Address:
        res = await self.session.execute(
            select(Address).where(Address.id == address_id, Address.user_id == user_id)
        )
        addr = res.scalar_one_or_none()
        if not addr:
            raise DomainException("Address not found", code="NOT_FOUND", status_code=404)
        return addr

    async def update_address(self, user_id: str, address_id: str, data: AddressUpdate) -> Address:
        addr = await self._get_owned(user_id, address_id)
        changes = data.model_dump(exclude_unset=True)
        if changes.get("is_default"):
            await self.session.execute(
                update(Address).where(Address.user_id == user_id).values(is_default=False)
            )
        for field, value in changes.items():
            setattr(addr, field, value)
        await self.session.commit()
        await self.session.refresh(addr)
        return addr

    async def delete_address(self, user_id: str, address_id: str) -> None:
        addr = await self._get_owned(user_id, address_id)
        await self.session.delete(addr)
        await self.session.commit()

    async def set_default(self, user_id: str, address_id: str) -> Address:
        addr = await self._get_owned(user_id, address_id)
        await self.session.execute(
            update(Address).where(Address.user_id == user_id).values(is_default=False)
        )
        addr.is_default = True
        await self.session.commit()
        await self.session.refresh(addr)
        return addr
