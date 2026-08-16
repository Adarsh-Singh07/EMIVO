from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, set_db_context
from modules.notifications.service import NotificationService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    body: str
    link: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: List[NotificationItem]
    unread_count: int


def _service(session: AsyncSession = Depends(set_db_context)) -> NotificationService:
    return NotificationService(session)


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    unread_only: bool = False,
    limit: int = 30,
    service: NotificationService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    items = await service.list_notifications(str(current_user.id), unread_only, limit)
    count = await service.unread_count(str(current_user.id))
    return NotificationListResponse(
        items=[NotificationItem.model_validate(n) for n in items], unread_count=count
    )


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    service: NotificationService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    await service.mark_read(str(current_user.id), notification_id)
    return {"status": "read"}


@router.post("/read-all")
async def mark_all_notifications_read(
    service: NotificationService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    count = await service.mark_all_read(str(current_user.id))
    return {"status": "ok", "marked": count}
