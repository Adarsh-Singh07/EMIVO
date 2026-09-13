"""Notification delivery providers. Email goes through Resend (configured);
SMS/WhatsApp implementations slot in behind the same interface in v1.0."""
import logging
from abc import ABC, abstractmethod
from typing import Any

import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class NotificationProvider(ABC):
    @abstractmethod
    async def send_email(
        self, to_email: str, subject: str, html: str, text: str = ""
    ) -> bool:
        pass


class ResendEmailProvider(NotificationProvider):
    """Transactional email via the Resend HTTP API."""

    API_URL = "https://api.resend.com/emails"

    def __init__(self, api_key: str, from_address: str):
        if not api_key:
            raise ValueError("Resend provider requires RESEND_API_KEY")
        self.api_key = api_key
        self.from_address = from_address

    async def send_email(self, to_email: str, subject: str, html: str, text: str = "") -> bool:
        payload = {
            "from": self.from_address,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        if text:
            payload["text"] = text
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    self.API_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                )
            if resp.status_code in (200, 201):
                return True
            logger.error(
                "resend email failed %s: %s", resp.status_code, resp.text[:500]
            )
            return False
        except httpx.HTTPError as exc:
            logger.error("resend email error: %s", exc)
            return False


class MockEmailProvider(NotificationProvider):
    """Logs instead of sending — used when no API key is configured or in
    non-prod environments so flows remain testable."""

    async def send_email(self, to_email: str, subject: str, html: str, text: str = "") -> bool:
        logger.info("email (mock) to=%s subject=%s", to_email, subject)
        return True


def get_email_provider() -> NotificationProvider:
    key = settings.resend_api_key.get_secret_value()
    if key:
        return ResendEmailProvider(api_key=key, from_address=settings.email_from)
    if settings.is_prod:
        logger.warning("RESEND_API_KEY missing in prod — emails will be logged only")
    return MockEmailProvider()


# --------------------------------------------------------------------------- #
# SMS (OTP login)                                                              #
# --------------------------------------------------------------------------- #

class SmsProvider(ABC):
    """SMS delivery interface. `usable` must be False when the provider lacks
    credentials so callers can refuse OTP flows instead of silently logging
    codes (a logged OTP is an authentication bypass)."""

    usable: bool = False

    @abstractmethod
    async def send_otp(self, to_phone: str, code: str) -> bool: ...


class ConsoleSmsProvider(SmsProvider):
    """Logs the code instead of sending. Intentionally NOT usable in prod —
    a code that only reaches the logs is not a factor of authentication."""

    usable = False

    async def send_otp(self, to_phone: str, code: str) -> bool:
        logger.info("SMS (console) to=%s otp=%s (non-prod only)", to_phone, code)
        return True


class Msg91SmsProvider(SmsProvider):
    """MSG91 flow API. Requires MSG91_AUTH_KEY and a DLT-approved OTP
    template (MSG91_OTP_TEMPLATE_ID) whose OTP variable is '#OTP#'."""

    usable = True

    def __init__(self, auth_key: str, template_id: str, sender_id: str):
        self._auth_key = auth_key
        self._template_id = template_id
        self._sender_id = sender_id

    async def send_otp(self, to_phone: str, code: str) -> bool:
        mobile = to_phone.lstrip("+")
        if len(mobile) == 10:
            mobile = f"91{mobile}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.msg91.com/api/v5/flow/",
                    headers={"authkey": self._auth_key, "Content-Type": "application/json"},
                    json={
                        "template_id": self._template_id,
                        "short_url": "0",
                        "recipients": [{"mobiles": mobile, "OTP": code}],
                        "sender": self._sender_id,
                    },
                )
        except httpx.RequestError as exc:
            logger.error("MSG91 send_otp HTTP error: %s", exc)
            return False
        if resp.status_code >= 400:
            logger.error("MSG91 send_otp failed HTTP %s: %s", resp.status_code, resp.text[:200])
            return False
        return True


def get_sms_provider() -> SmsProvider:
    key = settings.msg91_auth_key.get_secret_value() if settings.msg91_auth_key else ""
    template_id = settings.msg91_otp_template_id or ""
    if settings.sms_provider == "msg91" and key and template_id:
        return Msg91SmsProvider(auth_key=key, template_id=template_id, sender_id=settings.msg91_sender_id)
    if settings.is_prod and settings.sms_provider == "msg91":
        logger.warning("SMS_PROVIDER=msg91 but MSG91_AUTH_KEY/MSG91_OTP_TEMPLATE_ID missing")
    return ConsoleSmsProvider()
