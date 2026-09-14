"""Support tickets — Service-Desk style, user-scoped via RLS."""
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Text, DateTime, ForeignKey, func, Integer
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    ticket_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    order_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    order_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False)  # order|payment|product|delivery|other
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open", server_default="open")  # open|in_progress|resolved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages: Mapped[List["SupportTicketMessage"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", lazy="selectin",
        order_by="SupportTicketMessage.created_at",
    )


class SupportTicketMessage(Base):
    __tablename__ = "support_ticket_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender: Mapped[str] = mapped_column(String(10), nullable=False)  # user | admin | bot
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped[SupportTicket] = relationship(back_populates="messages")
