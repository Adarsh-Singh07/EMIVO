from typing import Optional, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from modules.businesses.models import Business

class BusinessRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, business: Business) -> Business:
        self.session.add(business)
        await self.session.commit()
        await self.session.refresh(business)
        return business

    async def get_by_id(self, business_id: str) -> Optional[Business]:
        stmt = select(Business).where(
            Business.id == business_id,
            Business.deleted_at.is_(None)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Business]:
        stmt = select(Business).where(
            Business.slug == slug,
            Business.deleted_at.is_(None)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, business: Business) -> Business:
        await self.session.commit()
        await self.session.refresh(business)
        return business
