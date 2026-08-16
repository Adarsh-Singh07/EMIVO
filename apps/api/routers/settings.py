from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.dependencies import require_staff, set_db_context
from modules.settings.schemas import BusinessSettingsResponse, BusinessSettingsUpdate
from modules.settings.service import SettingsService

router = APIRouter()


async def _staff_business_id(
    session: AsyncSession = Depends(set_db_context),
    _staff=Depends(require_staff),
) -> str:
    """Tenant identity comes from the authenticated session (never a header)."""
    res = await session.execute(
        text("SELECT NULLIF(current_setting('app.business_id', true), '')")
    )
    return str(res.scalar())


@router.get("/settings", response_model=BusinessSettingsResponse, dependencies=[Depends(require_staff)])
async def get_business_settings(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: str = Depends(_staff_business_id),
):
    service = SettingsService(db)
    return await service.get_settings(business_id=tenant_id)


@router.put("/settings", response_model=BusinessSettingsResponse, dependencies=[Depends(require_staff)])
async def update_business_settings(
    payload: BusinessSettingsUpdate,
    db: AsyncSession = Depends(get_db_session),
    tenant_id: str = Depends(_staff_business_id),
):
    service = SettingsService(db)
    return await service.update_settings(business_id=tenant_id, payload=payload)
