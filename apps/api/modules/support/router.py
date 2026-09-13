from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.dependencies import get_current_user, require_staff
from modules.support.schemas import TicketCreate, TicketMessageCreate, TicketOut, TicketStatusUpdate
from modules.support.service import SupportService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/support", tags=["Support"])


def _service(session: AsyncSession = Depends(get_db_session)) -> SupportService:
    return SupportService(session)


@router.post("/tickets", response_model=TicketOut, status_code=201)
async def create_ticket(
    payload: TicketCreate,
    service: SupportService = Depends(_service),
    user: User = Depends(get_current_user),
):
    order_number = None
    if payload.order_id:
        from modules.orders.service import OrderService
        order = await OrderService(service.session).get_order_for_user(
            payload.order_id, user, _is_staff(user)
        )
        order_number = order.order_number
    return await service.create_ticket(
        user_id=str(user.id), category=payload.category, subject=payload.subject,
        description=payload.description, order_id=payload.order_id,
        order_number=order_number,
    )


def _is_staff(user: User) -> bool:
    roles = (user._token_payload or {}).get("roles", []) if hasattr(user, "_token_payload") else []
    return any(r in ("platform_admin", "owner", "staff") for r in roles)


@router.get("/tickets", response_model=list[TicketOut])
async def my_tickets(
    status: Optional[str] = Query(None),
    service: SupportService = Depends(_service),
    user: User = Depends(get_current_user),
):
    tickets, _ = await service.list_tickets(str(user.id), status=status)
    return tickets


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    ticket_id: str,
    service: SupportService = Depends(_service),
    user: User = Depends(get_current_user),
):
    return await service.get_ticket(ticket_id, str(user.id))


@router.post("/tickets/{ticket_id}/messages", response_model=TicketOut)
async def reply_ticket(
    ticket_id: str,
    payload: TicketMessageCreate,
    service: SupportService = Depends(_service),
    user: User = Depends(get_current_user),
):
    return await service.add_message(ticket_id, str(user.id), "user", payload.body)
