import logging
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import async_session_maker
from modules.whatsapp.service import WhatsAppService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks/whatsapp", tags=["WhatsApp Webhook"])


async def _async_process_whatsapp(payload: Dict[str, Any]) -> None:
    """Background processor for inbound WhatsApp message to avoid HTTP timeout."""
    try:
        logger.info("Inbound WhatsApp raw payload: %s", payload)

        # Extract sender phone
        sender = (
            payload.get("customerNumber")
            or payload.get("customer_number")
            or payload.get("mobile")
            or payload.get("sender")
            or payload.get("from")
            or ""
        )

        # Extract message content
        content = payload.get("content")
        message_text = ""
        if isinstance(content, dict):
            message_text = content.get("text") or content.get("title") or content.get("body") or ""
        elif isinstance(content, str):
            message_text = content
        else:
            message_text = payload.get("text") or payload.get("message") or ""

        # Extract button text if interactive
        if not message_text and payload.get("button"):
            btn = payload.get("button")
            message_text = btn.get("text") or btn.get("payload") or ""

        # Meta Cloud API fallback schema
        if (not sender or not message_text) and payload.get("entry"):
            try:
                msg_obj = payload["entry"][0]["changes"][0]["value"]["messages"][0]
                if not sender:
                    sender = msg_obj.get("from", "")
                if not message_text and msg_obj.get("type") == "text":
                    message_text = msg_obj.get("text", {}).get("body", "")
            except (KeyError, IndexError, TypeError):
                pass

        if not sender or not message_text:
            logger.info("WhatsApp webhook received non-text/empty event: %s", payload)
            return

        async with async_session_maker() as session:
            svc = WhatsAppService(session)
            await svc.handle_inbound_message(sender_raw=str(sender), message_text=str(message_text))
    except Exception as exc:
        logger.exception("Failed processing inbound WhatsApp webhook: %s", exc)


@router.get("")
async def verify_whatsapp_webhook(request: Request):
    """GET verification challenge for MSG91 / Meta webhook setup."""
    challenge = request.query_params.get("hub.challenge") or request.query_params.get("challenge")
    if challenge:
        return Response(content=challenge, media_type="text/plain")
    return {"status": "active", "service": "Elektrix WhatsApp Bot Webhook"}


@router.post("", status_code=status.HTTP_200_OK)
async def receive_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """POST endpoint for MSG91 Inbound WhatsApp Webhook.
    Responds immediately (<50ms) with HTTP 200 and processes chat in background task."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    if payload:
        background_tasks.add_task(_async_process_whatsapp, payload)

    return {"status": "received"}
