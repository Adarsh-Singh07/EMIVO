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
    try:
        reply, ticket_action = await ask_gemini(session, str(user.id), payload.message)
    except Exception:
        raise DomainException(
            "The assistant is unavailable right now — please raise a ticket instead.",
            code="CHATBOT_UNAVAILABLE", status_code=503,
        )

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
