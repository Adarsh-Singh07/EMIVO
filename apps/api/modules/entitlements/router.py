from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db_session
from core.database import tenant_context
from .schemas import TenantPlan, UsageMetrics
from .repository import EntitlementsRepository
from .models import SubscriptionPlan

router = APIRouter(prefix="/entitlements", tags=["entitlements"])


@router.get("/plan", response_model=TenantPlan)
async def get_tenant_plan(session: AsyncSession = Depends(get_db_session)):
    business_id = tenant_context.get()
    if not business_id:
        raise HTTPException(status_code=400, detail="Missing tenant context")

    repo = EntitlementsRepository(session)
    plan = await repo.get_plan(business_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    return TenantPlan(
        business_id=plan.business_id,
        plan_name=plan.plan_name,
        requests_limit=plan.requests_limit,
        monthly_uploads_mb_limit=plan.monthly_uploads_mb_limit,
        features=plan.features,
    )


@router.get("/usage/{month_year}", response_model=UsageMetrics)
async def get_tenant_usage(
    month_year: str, session: AsyncSession = Depends(get_db_session)
):
    business_id = tenant_context.get()
    if not business_id:
        raise HTTPException(status_code=400, detail="Missing tenant context")

    repo = EntitlementsRepository(session)
    usage = await repo.get_usage(business_id, month_year)
    if not usage:
        return UsageMetrics(
            business_id=business_id,
            requests_count=0,
            uploads_mb_count=0.0,
            month_year=month_year,
        )

    return UsageMetrics(
        business_id=usage.business_id,
        requests_count=usage.requests_count,
        uploads_mb_count=usage.uploads_mb_count,
        month_year=usage.month_year,
    )
