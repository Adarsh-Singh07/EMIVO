import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from modules.settings.repository import SettingsRepository
from modules.settings.schemas import BusinessSettingsResponse, BusinessSettingsUpdate


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.repository = SettingsRepository(db)

    async def get_settings(self, business_id: str) -> BusinessSettingsResponse:
        settings = await self.repository.get_by_business_id(business_id)
        if not settings:
            # Return empty base config if none exists, wait for explicit create
            return BusinessSettingsResponse(
                id=str(uuid.uuid4()),
                business_id=business_id,
                created_at=datetime.now(timezone.utc),
                config={}
            )
        return settings

    async def update_settings(self, business_id: str, payload: BusinessSettingsUpdate) -> BusinessSettingsResponse:
        settings = await self.repository.create_or_update(
            business_id=business_id,
            config=payload.config
        )
        return settings
