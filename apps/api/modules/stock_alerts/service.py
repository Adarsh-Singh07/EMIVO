import logging
import re
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.outbox.models import OutboxEvent
from modules.stock_alerts.models import StockAlert
from modules.stock_alerts.schemas import StockAlertResponse

logger = logging.getLogger(__name__)


def normalize_in_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d]", "", phone or "")
    if len(cleaned) == 10:
        return f"91{cleaned}"
    if cleaned.startswith("0") and len(cleaned) == 11:
        return f"91{cleaned[1:]}"
    return cleaned


class StockAlertService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def subscribe(
        self,
        product_id: str,
        phone: str,
        email: Optional[str] = None,
        user_id: Optional[str] = None,
        channel: str = "whatsapp",
    ) -> StockAlertResponse:
        norm_phone = normalize_in_phone(phone)
        if not norm_phone or len(norm_phone) < 10:
            raise DomainException("Invalid mobile number", code="INVALID_PHONE", status_code=400)

        # Check product exists
        prod = (await self.session.execute(
            text("SELECT id, name, slug, business_id FROM products WHERE id = :pid AND deleted_at IS NULL"),
            {"pid": product_id},
        )).mappings().first()
        if not prod:
            raise DomainException("Product not found", code="NOT_FOUND", status_code=404)

        # Upsert stock alert
        await self.session.execute(
            text("""
                INSERT INTO stock_alerts (id, user_id, product_id, phone, email, channel, notified_at, created_at)
                VALUES (gen_random_uuid()::text, :uid, :pid, :phone, :email, :channel, NULL, now())
                ON CONFLICT (phone, product_id) DO UPDATE SET
                    notified_at = NULL,
                    email = COALESCE(EXCLUDED.email, stock_alerts.email),
                    user_id = COALESCE(EXCLUDED.user_id, stock_alerts.user_id),
                    channel = EXCLUDED.channel
            """),
            {
                "uid": user_id,
                "pid": product_id,
                "phone": norm_phone,
                "email": (email or "").strip().lower() or None,
                "channel": channel or "whatsapp",
            },
        )

        # Queue confirmation outbox event for WhatsApp template notify_me_confirm
        self.session.add(OutboxEvent(
            tenant_id=str(prod["business_id"]),
            type="stock_alert.subscribed",
            payload={
                "product_id": str(prod["id"]),
                "product_name": prod["name"],
                "slug": prod["slug"],
                "phone": norm_phone,
                "email": email,
                "user_id": user_id,
            },
        ))
        await self.session.commit()

        # Fetch created row
        row = (await self.session.execute(
            select(StockAlert).where(StockAlert.phone == norm_phone, StockAlert.product_id == product_id)
        )).scalar_one()

        return StockAlertResponse(
            id=row.id,
            product_id=row.product_id,
            product_name=prod["name"],
            product_slug=prod["slug"],
            phone=row.phone,
            email=row.email,
            channel=row.channel,
            notified_at=row.notified_at,
            created_at=row.created_at,
        )

    async def list_for_user(self, user_id: str) -> List[StockAlertResponse]:
        query = text("""
            SELECT sa.id, sa.product_id, sa.phone, sa.email, sa.channel, sa.notified_at, sa.created_at,
                   p.name AS product_name, p.slug AS product_slug
            FROM stock_alerts sa
            JOIN products p ON p.id = sa.product_id
            WHERE sa.user_id = :uid
            ORDER BY sa.created_at DESC
        """)
        res = (await self.session.execute(query, {"uid": user_id})).mappings().all()
        return [
            StockAlertResponse(
                id=r["id"],
                product_id=r["product_id"],
                product_name=r["product_name"],
                product_slug=r["product_slug"],
                phone=r["phone"],
                email=r["email"],
                channel=r["channel"],
                notified_at=r["notified_at"],
                created_at=r["created_at"],
            )
            for r in res
        ]

    async def notify_back_in_stock(self, product_id: str) -> int:
        """Called by InventoryService when stock increases from 0 -> positive.
        Queues product.back_in_stock outbox events for all pending subscribers."""
        prod = (await self.session.execute(
            text("SELECT id, name, slug, business_id FROM products WHERE id = :pid"),
            {"pid": product_id},
        )).mappings().first()
        if not prod:
            return 0

        pending_res = (await self.session.execute(
            text("""
                SELECT id, user_id, phone, email, channel 
                FROM stock_alerts 
                WHERE product_id = :pid AND notified_at IS NULL
            """),
            {"pid": product_id},
        )).mappings().all()

        if not pending_res:
            return 0

        alert_ids = []
        for r in pending_res:
            alert_ids.append(r["id"])
            self.session.add(OutboxEvent(
                tenant_id=str(prod["business_id"]),
                type="product.back_in_stock",
                payload={
                    "product_id": str(prod["id"]),
                    "product_name": prod["name"],
                    "slug": prod["slug"],
                    "phone": r["phone"],
                    "email": r["email"],
                    "user_id": r["user_id"],
                    "channel": r["channel"],
                },
            ))

        await self.session.execute(
            text("UPDATE stock_alerts SET notified_at = now() WHERE id = ANY(:ids)"),
            {"ids": alert_ids},
        )
        await self.session.commit()
        logger.info("Queued back-in-stock alerts for product %s to %s recipients", product_id, len(alert_ids))
        return len(alert_ids)
