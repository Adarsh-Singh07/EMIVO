"""WhatsApp order updates via MSG91 (optional, env-gated).

Off by default: get_whatsapp_provider() returns None unless
WHATSAPP_ENABLED=true AND MSG91 auth + at least one approved WABA template
name are configured (template names are per-business WABA approvals the
owner must create in Meta/MSG91 — code cannot invent them). When a template
for an event is missing, that notification is skipped silently; nothing
blocks the order flow.
"""
import logging
from typing import Dict, Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

# Events we can notify about — maps to WABA template names from settings.
SUPPORTED_EVENTS = ("order.shipped", "order.delivered", "order.cancelled")


class Msg91WhatsAppProvider:
    """MSG91 WhatsApp outbound (template messages only — no free-form text)."""

    API_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound"

    def __init__(self, auth_key: str, from_number: str, templates: Dict[str, str]):
        self._auth_key = auth_key
        self._from = from_number
        self._templates = templates  # event_type -> approved template name

    async def send_template(self, to_phone: str, event_type: str, values: Dict[str, str]) -> bool:
        template_name = self._templates.get(event_type)
        if not template_name:
            return False
        mobile = to_phone.lstrip("+")
        if len(mobile) == 10:
            mobile = f"91{mobile}"
        payload = {
            "integratedNumber": self._from,
            "contentType": "template",
            "payload": {
                "to": mobile,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": "en",
                    "buttonUrlData": {"1": values.get("link", "")},
                    "values": {
                        "1": values.get("order_number", ""),
                        "2": values.get("tracking_number", ""),
                    },
                },
            },
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    self.API_URL,
                    json=payload,
                    headers={"authkey": self._auth_key, "Content-Type": "application/json"},
                )
            if resp.status_code >= 400:
                logger.error("whatsapp send failed %s: %s", resp.status_code, resp.text[:200])
                return False
            return True
        except httpx.RequestError as exc:
            logger.error("whatsapp send error: %s", exc)
            return False


def get_whatsapp_provider() -> Optional[Msg91WhatsAppProvider]:
    """Returns the provider only when fully configured; None means 'off'."""
    if not settings.whatsapp_enabled:
        return None
    auth_key = settings.msg91_auth_key.get_secret_value() if settings.msg91_auth_key else ""
    templates = {}
    for pair in (settings.msg91_whatsapp_templates or "").split(","):
        if "=" in pair:
            event, name = pair.split("=", 1)
            event, name = event.strip(), name.strip()
            if event in SUPPORTED_EVENTS and name:
                templates[event] = name
    if not auth_key or not settings.msg91_whatsapp_from or not templates:
        logger.warning("WHATSAPP_ENABLED=true but MSG91 config incomplete — WhatsApp off")
        return None
    return Msg91WhatsAppProvider(auth_key, settings.msg91_whatsapp_from, templates)


async def maybe_send_order_whatsapp(session, event_type: str, payload: dict) -> Optional[bool]:
    """Dispatch hook for order.* outbox events. No-op when WhatsApp is off or
    the user has no phone on file. Never raises into the dispatch path."""
    if not event_type.startswith("order."):
        return None
    provider = get_whatsapp_provider()
    if provider is None:
        return None
    if event_type not in SUPPORTED_EVENTS:
        return None

    from sqlalchemy import text

    user_id = payload.get("user_id")
    if not user_id:
        return None
    phone = (await session.execute(
        text("SELECT phone FROM users WHERE id = :uid AND phone IS NOT NULL"),
        {"uid": str(user_id)},
    )).scalar()
    if not phone:
        return None

    storefront = settings.storefront_url
    link = f"{storefront}/order-tracking?number={payload.get('order_number', '')}"
    return await provider.send_template(
        phone, event_type,
        {
            "order_number": payload.get("order_number") or "",
            "tracking_number": payload.get("tracking_number") or "",
            "link": link,
        },
    )
