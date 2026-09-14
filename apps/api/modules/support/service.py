"""Support ticket service. User scoping rides on RLS (app.user_id GUC);
staff see everything via elektrix_is_staff()."""
import secrets
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.support.models import SupportTicket, SupportTicketMessage


class SupportService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _bind(self, user_id: Optional[str], role: Optional[str] = None) -> None:
        await self.session.execute(
            text("SELECT set_config('app.user_id', :uid, true)"),
            {"uid": user_id or ""},
        )
        if role:
            await self.session.execute(
                text("SELECT set_config('app.role', :role, true)"), {"role": role}
            )

    async def create_ticket(self, user_id: str, category: str, subject: str,
                            description: str, order_id: Optional[str] = None,
                            order_number: Optional[str] = None) -> SupportTicket:
        # The sequence must count ALL tickets (any user's), so bind the
        # platform role for this transaction; the row's user_id still scopes
        # visibility afterwards. IntegrityError retries cover concurrent raises.
        await self._bind(user_id, role="platform_admin")
        from datetime import datetime as _dt, timezone as _tz
        day = _dt.now(_tz.utc).strftime("%d%m%y")
        candidate = None
        for seq in range(1, 60):
            trial = f"INC{day}{seq:03d}"
            if not (await self.session.execute(text(
                "SELECT 1 FROM support_tickets WHERE ticket_number = :t"
            ), {"t": trial})).first():
                candidate = trial
                break
        if candidate is None:
            candidate = f"INC{day}{secrets.token_hex(2).upper()}"
        ticket = SupportTicket(
            user_id=str(user_id), order_id=order_id, order_number=order_number,
            category=category, subject=subject.strip()[:200], ticket_number=candidate,
        )
        self.session.add(ticket)
        await self.session.flush()
        self.session.add(SupportTicketMessage(
            ticket_id=ticket.id, sender="user", body=description.strip(),
        ))
        await self.session.commit()
        await self.session.refresh(ticket)
        return ticket

    async def add_message(self, ticket_id: str, user_id: str, sender: str, body: str, role: Optional[str] = None, commit: bool = True) -> SupportTicket:
        await self._bind(user_id, role)
        ticket = (await self.session.execute(
            text("SELECT * FROM support_tickets WHERE id = :id"), {"id": ticket_id}
        )).first()
        if not ticket:
            raise DomainException("Ticket not found", code="NOT_FOUND", status_code=404)
        self.session.add(SupportTicketMessage(ticket_id=ticket_id, sender=sender, body=body.strip()))
        if sender == "user":
            await self.session.execute(text(
                "UPDATE support_tickets SET status = 'open' WHERE id = :id AND status = 'resolved'"
            ), {"id": ticket_id})
        if commit:
            await self.session.commit()
        return await self.get_ticket(ticket_id, user_id)

    async def get_ticket(self, ticket_id: str, user_id: str, role: Optional[str] = None) -> SupportTicket:
        await self._bind(user_id, role)
        ticket = await self.session.get(SupportTicket, ticket_id)
        if not ticket:
            raise DomainException("Ticket not found", code="NOT_FOUND", status_code=404)
        return ticket

    async def list_tickets(self, user_id: str, status: Optional[str] = None,
                           page: int = 1, page_size: int = 20, role: Optional[str] = None) -> Tuple[List[SupportTicket], int]:
        await self._bind(user_id, role)
        cond = "AND status = :st" if status else ""
        params = {"off": (page - 1) * page_size, "lim": page_size, **({"st": status} if status else {})}
        rows = (await self.session.execute(text(
            f"SELECT id FROM support_tickets WHERE 1=1 {cond} ORDER BY updated_at DESC OFFSET :off LIMIT :lim"
        ), params)).scalars().all()
        total = (await self.session.execute(text(
            f"SELECT count(*) FROM support_tickets WHERE 1=1 {cond}"
        ), params)).scalar()
        tickets = [await self.session.get(SupportTicket, r) for r in rows]
        return [t for t in tickets if t], total or 0
