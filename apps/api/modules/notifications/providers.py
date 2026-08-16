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
