
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session as get_db
from core.tenant import require_tenant_context
from modules.settings.schemas import BusinessSettingsResponse, BusinessSettingsUpdate
from modules.settings.service import SettingsService

router = APIRouter()

@router.get("/settings", response_model=BusinessSettingsResponse)
async def get_business_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(require_tenant_context)
):
    service = SettingsService(db)
    return await service.get_settings(business_id=tenant_id)

@router.put("/settings", response_model=BusinessSettingsResponse)
async def update_business_settings(
    payload: BusinessSettingsUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(require_tenant_context)
):
    service = SettingsService(db)
    return await service.update_settings(business_id=tenant_id, payload=payload)
