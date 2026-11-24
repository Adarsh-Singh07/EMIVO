"""Append-only audit trail.

Every state-changing action — seller, staff, admin or system — writes one row
here with the actor, the entity, the changed fields and before/after state.
The table is append-only at the database level: `emivo_app` holds INSERT and
SELECT only, and RLS carries no UPDATE/DELETE policy.
"""
import enum
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import BigInteger, DateTime, Index, String, Text, text
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from core.database import Base


class ActorType(str, enum.Enum):
    USER = "user"
    SELLER = "seller"
    STAFF = "staff"
    ADMIN = "admin"
    SYSTEM = "system"


class AuditStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    DENIED = "denied"


class AuditSeverity(str, enum.Enum):
    INFO = "info"
    NOTICE = "notice"
    WARNING = "warning"
    CRITICAL = "critical"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Monotonic ordering key, assigned by the DB sequence. Not part of the PK:
    # the trail is ordered by insertion, never looked up by seq.
    seq: Mapped[int] = mapped_column(
        BigInteger, nullable=False, unique=True,
        server_default=text("nextval('audit_logs_seq_seq')"),
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    # Who
    actor_type: Mapped[str] = mapped_column(String(20), nullable=False, default="system")
    actor_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    actor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    actor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    actor_role: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    business_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # What
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    entity_label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Outcome
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success")
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info")

    # Detail
    changed_fields: Mapped[List[str]] = mapped_column(JSONB, nullable=False, default=list)
    before_state: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    meta: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    # Where from
    # `inet`, matching the DDL: asyncpg rejects a varchar bind for this column.
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    http_method: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    http_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_audit_logs_occurred", "occurred_at"),
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_actor", "actor_id"),
        Index("ix_audit_logs_action", "action"),
    )
