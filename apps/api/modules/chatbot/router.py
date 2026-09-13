from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db_session
from core.dependencies import get_current_user
from core.exceptions import DomainException
from core.redis import redis_manager
from modules.support.service import SupportService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/support/chat", tags=["Support"])


class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[dict] = Field(default_factory=list, max_length=20)
    user_name: str = Field("", max_length=100)


class ChatOut(BaseModel):
    reply: str
    ticket: dict | None = None


@router.post("", response_model=ChatOut)
async def chat(
    payload: ChatIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
):
    # Daily per-user cap so the API key can't be drained by scripting.
    bucket = f"chat:{user.id}:{datetime.now(timezone.utc):%Y%m%d}"
    count = await redis_manager.client.incr(bucket)
    if count == 1:
        await redis_manager.client.expire(bucket, 86400)
    if count > settings.chatbot_daily_message_limit:
        raise DomainException(
            "You've reached today's chat limit — please raise a ticket instead.",
            code="RATE_LIMITED", status_code=429,
        )

    from modules.chatbot.service import ask_gemini
    name = (payload.user_name or user.first_name or "").strip()[:100]
    try:
        reply, ticket_action, cancel_number = await ask_gemini(
            session, str(user.id), name or "there", payload.message, payload.history
        )
    except Exception:
        raise DomainException(
            "The assistant is unavailable right now — please raise a ticket instead.",
            code="CHATBOT_UNAVAILABLE", status_code=503,
        )

    # Execute a CONFIRMED cancellation server-side: ownership + state machine
    # + stock release all go through the same customer-cancel path as the UI.
    if cancel_number:
        from modules.orders.service import OrderService
        try:
            order = await OrderService(session).cancel_order_by_number(
                cancel_number, user, reason="cancelled via support assistant"
            )
            reply += (
                f"\n\n✅ Done — order {order.order_number} ({order.total / 100:.0f} ₹) is cancelled "
                "and any reserved stock has been released."
            )
        except DomainException as exc:
            reply += f"\n\n⚠️ I couldn't cancel {cancel_number}: {exc.message}"

    ticket = None
    if ticket_action:
        svc = SupportService(session)
        t = await svc.create_ticket(
            user_id=str(user.id), category=ticket_action["category"],
            subject=ticket_action["subject"], description=ticket_action["description"],
        )
        await svc.add_message(t.id, str(user.id), "bot",
                              "I've raised this ticket for you — our team will reply here.")
        ticket = {"id": t.id, "subject": t.subject}

    return ChatOut(reply=reply, ticket=ticket)
