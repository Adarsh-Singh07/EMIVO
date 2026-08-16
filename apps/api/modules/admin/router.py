from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import require_staff, set_db_context
from modules.admin.schemas import (
    AdminUserList,
    DashboardStats,
    StoreSettingsResponse,
    StoreSettingsUpdate,
)
from modules.admin.service import AdminService

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _service(session: AsyncSession = Depends(set_db_context)) -> AdminService:
    return AdminService(session)


@router.get("/dashboard", response_model=DashboardStats, dependencies=[Depends(require_staff)])
async def dashboard(service: AdminService = Depends(_service)):
    """Operational dashboard: today's orders/revenue, pending, stock health,
    payments, 14-day revenue trend, recent orders, top products."""
    return await service.dashboard()


@router.get("/users", response_model=AdminUserList, dependencies=[Depends(require_staff)])
async def list_users(
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: AdminService = Depends(_service),
):
    items, total = await service.list_users(q, page, page_size)
    return AdminUserList(items=items, total=total, page=page, page_size=page_size)


@router.get("/store-settings", response_model=StoreSettingsResponse, dependencies=[Depends(require_staff)])
async def get_store_settings(service: AdminService = Depends(_service)):
    return await service.get_settings()


@router.put("/store-settings", response_model=StoreSettingsResponse, dependencies=[Depends(require_staff)])
async def update_store_settings(
    payload: StoreSettingsUpdate,
    service: AdminService = Depends(_service),
):
    """Runtime commerce switches: COD on/off + fee + max order, shipping rules,
    festival banner content, storefront announcement."""
    return await service.update_settings(payload)
