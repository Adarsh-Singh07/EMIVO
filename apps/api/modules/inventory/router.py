from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.dependencies import require_staff, set_db_context
from modules.inventory.schemas import (
    InventoryAdjustRequest,
    InventoryListResponse,
    InventoryMovementsResponse,
    InventoryResponse,
)
from modules.inventory.service import InventoryService

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


async def _staff_session(
    _staff=Depends(require_staff),
    session: AsyncSession = Depends(set_db_context),
) -> AsyncSession:
    return session


@router.get("", response_model=InventoryListResponse)
async def list_inventory(
    q: Optional[str] = None,
    low_stock: bool = False,
    out_of_stock: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(_staff_session),
):
    business_id = await session.execute(
        text("SELECT NULLIF(current_setting('app.business_id', true), '')")
    )
    service = InventoryService(session)
    return await service.list_inventory(
        business_id=str(business_id.scalar()),
        query=q,
        low_stock_only=low_stock,
        out_of_stock_only=out_of_stock,
        page=page,
        page_size=page_size,
    )


@router.get("/movements", response_model=InventoryMovementsResponse)
async def list_movements(
    product_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(_staff_session),
):
    service = InventoryService(session)
    return await service.movements(product_id, limit)


@router.post("/{product_id}/adjust", response_model=InventoryResponse)
async def adjust_stock(
    product_id: str,
    request: InventoryAdjustRequest,
    session: AsyncSession = Depends(_staff_session),
    staff=Depends(require_staff),
):
    business_id = await session.execute(
        text("SELECT NULLIF(current_setting('app.business_id', true), '')")
    )
    service = InventoryService(session)
    return await service.adjust(
        product_id=product_id,
        request=request,
        business_id=str(business_id.scalar()),
        actor_id=str(staff.id),
    )
