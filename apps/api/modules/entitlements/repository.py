from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from .models import SubscriptionPlan, UsageMeter
from .schemas import TenantPlan, UsageMetrics


class EntitlementsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_plan(self, business_id: str) -> SubscriptionPlan | None:
        result = await self.session.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.business_id == business_id)
        )
        return result.scalar_one_or_none()

    async def get_usage(self, business_id: str, month_year: str) -> UsageMeter | None:
        result = await self.session.execute(
            select(UsageMeter).where(
                UsageMeter.business_id == business_id,
                UsageMeter.month_year == month_year,
            )
        )
        return result.scalar_one_or_none()

    async def increment_requests_usage(
        self, business_id: str, month_year: str, count: int = 1
    ) -> None:
        meter = await self.get_usage(business_id, month_year)
        if meter:
            meter.requests_count += count
            await self.session.commit()

    async def increment_upload_usage(
        self, business_id: str, month_year: str, mb_count: float
    ) -> None:
        meter = await self.get_usage(business_id, month_year)
        if meter:
            meter.uploads_mb_count += mb_count
            await self.session.commit()
