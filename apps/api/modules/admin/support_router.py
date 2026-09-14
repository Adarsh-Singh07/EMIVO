"""Admin support box: all tickets, reply, resolve."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.dependencies import require_staff
from modules.support.schemas import TicketMessageCreate, TicketOut, TicketStatusUpdate
from modules.support.service import SupportService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/admin/support", tags=["Support"])


def _service(session: AsyncSession = Depends(get_db_session)) -> SupportService:
    return SupportService(session)


@router.get("/tickets", response_model=list[TicketOut], dependencies=[Depends(require_staff)])
async def all_tickets(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    service: SupportService = Depends(_service),
    staff: User = Depends(require_staff),
):
    tickets, _ = await service.list_tickets(str(staff.id), status=status, page=page, page_size=100, role="platform_admin")
    return tickets


@router.get("/tickets/{ticket_id}", response_model=TicketOut, dependencies=[Depends(require_staff)])
async def get_ticket(ticket_id: str, service: SupportService = Depends(_service),
                     staff: User = Depends(require_staff)):
    return await service.get_ticket(ticket_id, str(staff.id), role="platform_admin")


@router.post("/tickets/{ticket_id}/messages", response_model=TicketOut, dependencies=[Depends(require_staff)])
async def reply(ticket_id: str, payload: TicketMessageCreate,
                service: SupportService = Depends(_service), staff: User = Depends(require_staff)):
    return await service.add_message(ticket_id, str(staff.id), "admin", payload.body, role="platform_admin")


@router.patch("/tickets/{ticket_id}/status", response_model=TicketOut, dependencies=[Depends(require_staff)])
async def set_status(ticket_id: str, payload: TicketStatusUpdate,
                     service: SupportService = Depends(_service), staff: User = Depends(require_staff)):
    await service.add_message(
        ticket_id, str(staff.id), "admin",
        f"[status] {payload.status}" if payload.status == "resolved" else f"[status] {payload.status}",
    )
    from sqlalchemy import text
    await service.session.execute(
        text("UPDATE support_tickets SET status = :s WHERE id = :id"),
        {"s": payload.status, "id": ticket_id},
    )
    await service.session.commit()
    return await service.get_ticket(ticket_id, str(staff.id), role="platform_admin")
