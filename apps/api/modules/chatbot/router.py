import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.dependencies import optional_db_context, get_optional_user
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
    is_authenticated: bool = False


@router.post("", response_model=ChatOut)
async def chat(
    payload: ChatIn,
    request: Request,
    session: AsyncSession = Depends(optional_db_context),
    user: Optional[User] = Depends(get_optional_user),
):
    # Rate limit: Per-user bucket if authenticated, otherwise per-IP bucket
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    if user:
        bucket = f"chat:user:{user.id}:{today}"
    else:
        ip = (
            request.headers.get("CF-Connecting-IP")
            or request.headers.get("X-Forwarded-For")
            or (request.client.host if request.client else "guest")
        )
        clean_ip = ip.split(",")[0].strip()
        bucket = f"chat:guest:{clean_ip}:{today}"

    if redis_manager and getattr(redis_manager, "client", None):
        try:
            count = await redis_manager.client.incr(bucket)
            if count == 1:
                await redis_manager.client.expire(bucket, 86400)
            if count > settings.chatbot_daily_message_limit:
                raise DomainException(
                    "You've reached today's chat limit — please contact support directly.",
                    code="RATE_LIMITED",
                    status_code=429,
                )
        except DomainException:
            raise
        except Exception:
            pass

    from modules.chatbot.service import ask_gemini

    name = (payload.user_name or (user.first_name if user else "") or "").strip()[:100]
    user_id_str = str(user.id) if user else None

    try:
        reply, ticket_action, cancel_number = await ask_gemini(
            session, user_id_str, name or "there", payload.message, payload.history
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Chatbot error: %s", exc)
        raise DomainException(
            "The assistant is unavailable right now — please contact our support team.",
            code="CHATBOT_UNAVAILABLE",
            status_code=503,
        )

    # Execute order cancellation if confirmed (strictly for authenticated user)
    if cancel_number and user:
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
        if user and not ticket_action.get("is_guest"):
            # Authenticated user ticket
            svc = SupportService(session)
            t = await svc.create_ticket(
                user_id=str(user.id),
                category=ticket_action["category"],
                subject=ticket_action["subject"],
                description=ticket_action["description"],
            )
            await svc.add_message(t.id, str(user.id), "bot", "I've raised this ticket for you — our team will reply here.")
            ticket = {"id": t.id, "subject": t.subject}
        else:
            # Guest ticket / complaint
            guest_ticket_id = f"TK-{uuid.uuid4().hex[:8].upper()}"
            ticket = {"id": guest_ticket_id, "subject": ticket_action.get("subject", "Guest Support Complaint")}
            
            # Send notification email to support inbox
            try:
                from modules.notifications.providers import get_email_provider
                from modules.notifications.aliases import ALIAS_SUPPORT, CONTACT_INBOX
                email_prov = get_email_provider()
                g_name = ticket_action.get("name") or "Guest Visitor"
                g_email = ticket_action.get("email") or "Not provided"
                g_phone = ticket_action.get("phone") or "Not provided"
                html_body = f"""
                <h2>New Guest Complaint / Inquiry via Chatbot</h2>
                <p><strong>Ticket ID:</strong> {guest_ticket_id}</p>
                <p><strong>Customer Name:</strong> {g_name}</p>
                <p><strong>Email:</strong> {g_email}</p>
                <p><strong>Phone:</strong> {g_phone}</p>
                <p><strong>Subject:</strong> {ticket_action.get('subject')}</p>
                <h3>Details:</h3>
                <p>{ticket_action.get('description')}</p>
                """
                await email_prov.send_email(
                    to_email=CONTACT_INBOX,
                    subject=f"[{guest_ticket_id}] Chatbot Inquiry: {ticket_action.get('subject')}",
                    html=html_body,
                    from_address=ALIAS_SUPPORT,
                    reply_to=g_email if "@" in g_email else None
                )
            except Exception as mail_err:
                import logging
                logging.getLogger(__name__).warning("Failed to dispatch guest complaint email: %s", mail_err)

    return ChatOut(reply=reply, ticket=ticket, is_authenticated=bool(user))


# Guest identity verification inside the chat reuses the standard OTP flow
# (POST /api/v1/auth/otp/request + /verify) from the frontend: it supports
# EMAIL (works without an SMS provider) and PHONE, is already rate-limited,
# and its verify endpoint issues real tokens so the visitor becomes a fully
# authenticated user in the app — no chat-specific duplication needed.
