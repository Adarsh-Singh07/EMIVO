"""WhatsApp order updates via MSG91 (optional, env-gated).

Off by default: get_whatsapp_provider() returns None unless
WHATSAPP_ENABLED=true AND MSG91 auth + at least one approved WABA template
name are configured (template names are per-business WABA approvals the
owner must create in Meta/MSG91 — code cannot invent them). When a template
for an event is missing, that notification is skipped silently; nothing
blocks the order flow.
"""
import logging
from typing import Any, Dict, Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

# Events we can notify about — maps to WABA template names from settings.
SUPPORTED_EVENTS = (
    "order.shipped",
    "order.delivered",
    "order.created",
    "order.confirmed",
    "order.cancelled",
    "order.out_for_delivery",
    "order.refunded",
    "payment.captured",
    "payment.failed",
)


def format_inr(paise: int | float | None) -> str:
    """Format paise into Indian Rupee currency string."""
    if paise is None:
        return "₹0"
    rupees = paise / 100
    if rupees == int(rupees):
        return f"₹{int(rupees):,}"
    return f"₹{rupees:,.2f}"


def build_template_values(event_type: str, values: Dict[str, Any]) -> Dict[str, str]:
    """Map dynamic template variables according to approved MSG91/Meta schemas."""
    customer_name = values.get("customer_name") or "Valued Customer"
    order_number = values.get("order_number") or ""
    tracking_number = values.get("tracking_number") or ""
    amount_str = values.get("amount_formatted") or ""
    ref_id = values.get("reference_id") or ""

    if event_type == "order.shipped":
        # {{1}} = Customer Name, {{2}} = Order Number, {{3}} = Tracking AWB
        return {
            "1": customer_name,
            "2": order_number,
            "3": tracking_number,
        }
    elif event_type in ("order.delivered", "order.created", "order.confirmed", "order.cancelled"):
        # {{1}} = Customer Name, {{2}} = Order Number
        return {
            "1": customer_name,
            "2": order_number,
        }
    elif event_type == "order.out_for_delivery":
        # {{1}} = Customer Name, {{2}} = Order Number, {{3}} = Tracking AWB
        return {
            "1": customer_name,
            "2": order_number,
            "3": tracking_number,
        }
    elif event_type in ("payment.captured", "payment.success"):
        # {{1}} = Customer Name, {{2}} = Amount, {{3}} = Order Number, {{4}} = Txn Ref ID
        return {
            "1": customer_name,
            "2": amount_str,
            "3": order_number,
            "4": ref_id or "Completed",
        }
    elif event_type == "payment.failed":
        # {{1}} = Customer Name, {{2}} = Order Number, {{3}} = Amount
        return {
            "1": customer_name,
            "2": order_number,
            "3": amount_str,
        }
    elif event_type == "order.refunded":
        # {{1}} = Customer Name, {{2}} = Refund Amount, {{3}} = Order Number, {{4}} = Refund Ref
        return {
            "1": customer_name,
            "2": amount_str,
            "3": order_number,
            "4": ref_id or "Processed",
        }
    return {
        "1": customer_name,
        "2": order_number,
        "3": tracking_number,
    }


class Msg91WhatsAppProvider:
    """MSG91 WhatsApp outbound (template messages only — no free-form text)."""

    API_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound"

    def __init__(self, auth_key: str, from_number: str, templates: Dict[str, str]):
        self._auth_key = auth_key
        self._from = from_number
        self._templates = templates  # event_type -> approved template name

    async def send_template(self, to_phone: str, event_type: str, values: Dict[str, Any]) -> bool:
        template_name = self._templates.get(event_type)
        if not template_name:
            return False
        mobile = to_phone.lstrip("+").strip().replace(" ", "").replace("-", "")
        if len(mobile) == 10:
            mobile = f"91{mobile}"
        
        template_values = build_template_values(event_type, values)
        button_val = values.get("order_number") or ""

        payload = {
            "integratedNumber": self._from,
            "contentType": "template",
            "payload": {
                "to": mobile,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": "en",
                    "buttonUrlData": {"1": button_val},
                    "values": template_values,
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
    """Dispatch hook for order.* and payment.* outbox events. No-op when WhatsApp
    is off or the user/order has no phone on file. Never raises into the dispatch path."""
    if not (event_type.startswith("order.") or event_type.startswith("payment.")):
        return None
    provider = get_whatsapp_provider()
    if provider is None:
        return None
    if event_type not in SUPPORTED_EVENTS:
        return None

    from sqlalchemy import text

    user_id = payload.get("user_id")
    order_id = payload.get("order_id")
    phone = payload.get("phone")
    customer_name = payload.get("first_name") or payload.get("customer_name")

    # 1. Lookup user phone & name if missing
    if user_id and (not phone or not customer_name):
        res = (await session.execute(
            text("SELECT phone, first_name, full_name FROM users WHERE id = :uid"),
            {"uid": str(user_id)},
        )).first()
        if res:
            phone = phone or res[0]
            customer_name = customer_name or res[1] or (res[2].split()[0] if res[2] else "")

    # 2. Check order shipping_address if phone or name is still missing
    if (not phone or not customer_name) and order_id:
        res = (await session.execute(
            text("SELECT shipping_address FROM orders WHERE id = :oid"),
            {"oid": str(order_id)},
        )).first()
        if res and isinstance(res[0], dict):
            addr = res[0]
            phone = phone or addr.get("phone") or addr.get("mobile")
            if not customer_name:
                customer_name = addr.get("first_name") or (addr.get("name", "").split()[0] if addr.get("name") else "")

    if not phone:
        return None

    customer_name = customer_name or "Valued Customer"
    order_number = payload.get("order_number") or ""
    tracking_number = payload.get("tracking_number") or ""
    amount_paise = payload.get("amount") or payload.get("total")
    amount_formatted = format_inr(amount_paise)
    ref_id = payload.get("provider_payment_id") or payload.get("payment_id") or payload.get("refund_reference") or ""

    return await provider.send_template(
        to_phone=phone,
        event_type=event_type,
        values={
            "customer_name": customer_name,
            "order_number": order_number,
            "tracking_number": tracking_number,
            "amount_formatted": amount_formatted,
            "reference_id": str(ref_id),
        },
    )
