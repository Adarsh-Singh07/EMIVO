from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.settings.models import BusinessSettings


class SettingsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_business_id(self, business_id: str) -> BusinessSettings | None:
        query = select(BusinessSettings).where(BusinessSettings.business_id == business_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_or_update(self, business_id: str, config: dict[str, Any]) -> BusinessSettings:
        settings = await self.get_by_business_id(business_id)
        if not settings:
            settings = BusinessSettings(
                business_id=business_id,
                config=config
            )
            self.db.add(settings)
        else:
            settings.config = {**settings.config, **config}

        await self.db.commit()
        await self.db.refresh(settings)
        return settings

