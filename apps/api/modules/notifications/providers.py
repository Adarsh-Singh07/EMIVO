from abc import ABC, abstractmethod
from typing import Any

import structlog

logger = structlog.get_logger()


class NotificationProvider(ABC):
    @abstractmethod
    async def send_email(
        self, to_email: str, subject: str, template: str, context: dict[str, Any]
    ) -> bool:
        pass


class MockSESResendProvider(NotificationProvider):
    async def send_email(
        self, to_email: str, subject: str, template: str, context: dict[str, Any]
    ) -> bool:
        logger.info(
            "Mock Email Sent",
            to=to_email,
            subject=subject,
            template=template,
            context=context,
            provider="SES/Resend Adapter Mock",
        )
        return True
