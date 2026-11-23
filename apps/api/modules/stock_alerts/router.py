from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, get_optional_user, optional_db_context, set_db_context
from modules.stock_alerts.schemas import StockAlertCreateRequest, StockAlertResponse
from modules.stock_alerts.service import StockAlertService
from modules.users.models import User

router = APIRouter(tags=["Stock Alerts"])


@router.post("/api/v1/products/{product_id}/notify-me", response_model=StockAlertResponse)
async def subscribe_stock_alert(
    product_id: str,
    payload: StockAlertCreateRequest,
    session: AsyncSession = Depends(optional_db_context),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Subscribe to back-in-stock alerts for an out-of-stock product via WhatsApp and/or Email."""
    svc = StockAlertService(session)
    user_id = str(current_user.id) if current_user else None
    phone = payload.phone or (current_user.phone if current_user else "")
    email = payload.email or (current_user.email if current_user else None)

    return await svc.subscribe(
        product_id=product_id,
        phone=phone,
        email=email,
        user_id=user_id,
        channel=payload.channel,
    )


@router.get("/api/v1/account/stock-alerts", response_model=List[StockAlertResponse])
async def list_user_stock_alerts(
    session: AsyncSession = Depends(set_db_context),
    current_user: User = Depends(get_current_user),
):
    """List all back-in-stock subscriptions for the logged-in user."""
    svc = StockAlertService(session)
    return await svc.list_for_user(str(current_user.id))
