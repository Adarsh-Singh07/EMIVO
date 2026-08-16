"""Notification service: consumes outbox events, renders templates, delivers
email (Resend) and writes in-app notification rows. Runs inside the ARQ
worker — never inside API request transactions."""
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import DomainException
from modules.notifications.models import Notification
from modules.notifications.providers import get_email_provider
from modules.notifications.templates import TEMPLATES

logger = logging.getLogger(__name__)

# In-app notification titles per event type
IN_APP: dict[str, tuple[str, str]] = {
    "order.created": ("Order placed", "Your order {order_number} has been placed."),
    "payment.captured": ("Payment received", "Payment for {order_number} was successful."),
    "payment.failed": ("Payment failed", "Payment for {order_number} failed."),
    "order.shipped": ("Order shipped", "Your order {order_number} has been shipped."),
    "order.delivered": ("Order delivered", "Your order {order_number} was delivered."),
    "order.cancelled": ("Order cancelled", "Your order {order_number} was cancelled."),
    "order.refunded": ("Refund initiated", "Refund for {order_number} is on its way."),
}


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.email_provider = get_email_provider()

    # ------------------------------------------------------------------ #
    # Outbox processing (worker entrypoint)                                #
    # ------------------------------------------------------------------ #

    async def process_outbox_event(self, event_id: str) -> bool:
        """Deliver one outbox event. Returns True when processed (or
        permanently skipped). Raises on transient failure for retry."""
        res = await self.session.execute(
            text("SELECT id, tenant_id, type, payload, attempts FROM outbox_events WHERE id = :eid"),
            {"eid": event_id},
        )
        row = res.mappings().first()
        if not row:
            return True
        if str(row["id"]) != str(event_id):
            return True

        event_type = row["type"]
        payload: dict = row["payload"]

        try:
            await self._dispatch(event_type, payload)
            await self.session.execute(
                text("""
                    UPDATE outbox_events
                    SET status = 'processed', processed_at = now(), last_error = NULL
                    WHERE id = :eid
                """),
                {"eid": event_id},
            )
            await self.session.commit()
            return True
        except Exception as exc:
            attempts = row["attempts"] + 1
            status = "failed" if attempts >= 5 else "pending"
            await self.session.rollback()
            await self.session.execute(
                text("""
                    UPDATE outbox_events
                    SET attempts = :a, status = :s, last_error = :err
                    WHERE id = :eid
                """),
                {"a": attempts, "s": status, "err": str(exc)[:500], "eid": event_id},
            )
            await self.session.commit()
            logger.warning("outbox event %s failed (attempt %s): %s", event_id, attempts, exc)
            return status == "failed"  # permanent failure is "handled"

    async def _dispatch(self, event_type: str, payload: dict) -> None:
        # Set RLS context so notification inserts are permitted
        tenant = payload.get("business_id") or payload.get("tenant_id")
        if not tenant and event_type in TEMPLATES or event_type in IN_APP:
            tenant = await self._store_business_id()
        if tenant:
            await self.session.execute(
                text("SELECT set_config('app.business_id', :bid, true)"), {"bid": str(tenant)}
            )

        user_id = payload.get("user_id")

        # 1. Email
        if event_type in TEMPLATES:
            email = payload.get("email")
            if not email and user_id:
                email = await self._user_email(str(user_id))
            if email:
                subject, html = TEMPLATES[event_type](payload, settings.storefront_url)
                await self.email_provider.send_email(email, subject, html)

        # 2. In-app
        if event_type in IN_APP and user_id:
            title_tpl, body_tpl = IN_APP[event_type]
            self.session.add(Notification(
                user_id=str(user_id),
                type=event_type,
                title=title_tpl.format(**payload) if "{order_number}" in title_tpl else title_tpl,
                body=body_tpl.format(**payload),
                link="/account/orders",
                data={"order_id": payload.get("order_id")},
            ))
            await self.session.flush()

    async def _store_business_id(self) -> Optional[str]:
        from core.store import get_store_business_id
        try:
            return await get_store_business_id(self.session)
        except RuntimeError:
            return None

    async def _user_email(self, user_id: str) -> Optional[str]:
        # Notification worker runs unrestricted (root role) in the worker
        # process, so this lookup is allowed.
        res = await self.session.execute(
            text("SELECT email FROM users WHERE id = :uid"), {"uid": user_id}
        )
        return res.scalar()

    # ------------------------------------------------------------------ #
    # Customer notification center (API)                                   #
    # ------------------------------------------------------------------ #

    async def list_notifications(self, user_id: str, unread_only: bool = False,
                                 limit: int = 30) -> list[Notification]:
        from sqlalchemy import select
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.read_at.is_(None))
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def unread_count(self, user_id: str) -> int:
        res = await self.session.execute(
            text("SELECT count(*) FROM notifications WHERE user_id = :uid AND read_at IS NULL"),
            {"uid": user_id},
        )
        return res.scalar()

    async def mark_read(self, user_id: str, notification_id: str) -> None:
        res = await self.session.execute(
            text("""
                UPDATE notifications SET read_at = now()
                WHERE id = :nid AND user_id = :uid AND read_at IS NULL
            """),
            {"nid": notification_id, "uid": user_id},
        )
        if res.rowcount == 0:
            raise DomainException("Notification not found", code="NOT_FOUND", status_code=404)
        await self.session.commit()

    async def mark_all_read(self, user_id: str) -> int:
        res = await self.session.execute(
            text("UPDATE notifications SET read_at = now() WHERE user_id = :uid AND read_at IS NULL"),
            {"uid": user_id},
        )
        await self.session.commit()
        return res.rowcount
