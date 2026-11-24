"""Audit trail service.

Design goals
------------
* Never break the business operation. A failed audit write must not roll back
  a product update, so writes go through `record()` which swallows and logs
  errors by default (pass `strict=True` for cases where the audit row is a
  compliance precondition).
* Never leak secrets. `_scrub()` strips credential-shaped keys before the
  before/after snapshots are serialized.
* Cheap on the hot path: no extra round-trip beyond the INSERT, no SELECTs.
* Actor attribution is resolved once per request by `resolve_actor()` and
  threaded through from the router/dependency layer.

Actions follow `<entity>.<verb>` (e.g. `product.created`, `inventory.adjusted`,
`order.status_changed`) so the trail can be filtered by entity or by verb.
"""
import ipaddress
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from modules.audit.models import AuditLog, AuditSeverity, AuditStatus, ActorType

logger = logging.getLogger(__name__)

# Keys that must never reach the audit trail.
_SECRET_KEYS = {
    "password", "password_hash", "new_password", "current_password",
    "token", "access_token", "refresh_token", "secret", "api_key",
    "authorization", "otp", "delivery_otp", "jwt", "private_key",
}

# Fields too noisy to store in a diff but fine in metadata.
_IGNORED_DIFF_FIELDS = {"updated_at", "created_at", "seq"}


@dataclass
class Actor:
    """Who is performing the action."""
    type: str = ActorType.SYSTEM.value
    id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    business_id: Optional[str] = None
    # Request provenance, filled by the middleware-shaped context.
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    http_method: Optional[str] = None
    http_path: Optional[str] = None

    @classmethod
    def system(cls, reason: str = "") -> "Actor":
        return cls(type=ActorType.SYSTEM.value, name=reason or "system")


def _clean_ip(value: Optional[str]) -> Optional[str]:
    """Return a value PostgreSQL will accept for the `inet` column, else None.

    `resolve_actor` reads X-Forwarded-For, which can carry ports, brackets or
    proxy junk. A malformed value must not fail the audit insert (and, without
    a savepoint, must not abort the caller's transaction either), so anything
    that does not parse as an IP address is simply dropped.
    """
    if not value:
        return None
    candidate = str(value).strip()
    if not candidate:
        return None
    try:
        ipaddress.ip_address(candidate)
        return candidate
    except ValueError:
        return None


def _scrub(value: Any) -> Any:
    """Recursively drop secret-shaped keys and make values JSON-safe."""
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if str(k).lower() in _SECRET_KEYS:
                out[k] = "[redacted]"
            else:
                out[k] = _scrub(v)
        return out
    if isinstance(value, (list, tuple)):
        return [_scrub(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    # dates, Decimals, UUIDs, enums
    return str(value)


def diff(before: Optional[Dict[str, Any]], after: Optional[Dict[str, Any]]) -> List[str]:
    """Field names that actually changed between two snapshots."""
    if not before or not after:
        return sorted(set((before or {}).keys()) | set((after or {}).keys()))
    changed = []
    for key in set(before) | set(after):
        if key in _IGNORED_DIFF_FIELDS:
            continue
        if before.get(key) != after.get(key):
            changed.append(key)
    return sorted(changed)


def snapshot(obj: Any, fields: Iterable[str]) -> Dict[str, Any]:
    """Extract a plain dict of the given fields from an ORM object or mapping."""
    out: Dict[str, Any] = {}
    for f in fields:
        if isinstance(obj, dict):
            out[f] = obj.get(f)
        else:
            out[f] = getattr(obj, f, None)
    return _scrub(out)


class AuditService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def record(
        self,
        *,
        actor: Actor,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        entity_label: Optional[str] = None,
        status: str = AuditStatus.SUCCESS.value,
        severity: str = AuditSeverity.INFO.value,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        changed_fields: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        strict: bool = False,
    ) -> None:
        """Append one audit row in the caller's transaction.

        The insert runs inside a SAVEPOINT: if it fails, only the audit write is
        rolled back. Without the savepoint a rejected INSERT would abort the
        whole Postgres transaction, and `strict=False` — which is meant to keep
        the business operation alive — would fail to do so, because the caller's
        single commit would raise anyway.
        """
        try:
            changed = changed_fields if changed_fields is not None else diff(before, after)
            row = AuditLog(
                id=str(uuid.uuid4()),
                occurred_at=datetime.now(timezone.utc),
                actor_type=actor.type,
                actor_id=actor.id,
                actor_email=actor.email,
                actor_name=actor.name,
                actor_role=actor.role,
                business_id=actor.business_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_label=entity_label,
                status=status,
                severity=severity,
                changed_fields=changed or [],
                before_state=_scrub(before) if before else None,
                after_state=_scrub(after) if after else None,
                meta=_scrub(metadata or {}),
                # `ip_address` is an inet column: anything that is not a valid
                # address is dropped rather than allowed to fail the insert.
                ip_address=_clean_ip(actor.ip_address),
                user_agent=actor.user_agent,
                request_id=actor.request_id,
                http_method=actor.http_method,
                http_path=actor.http_path,
            )
            async with self.session.begin_nested():
                self.session.add(row)
        except Exception:
            logger.exception(
                "audit write failed action=%s entity=%s:%s", action, entity_type, entity_id
            )
            if strict:
                raise

    # ------------------------------------------------------------------ #
    # Read side (admin portal)                                            #
    # ------------------------------------------------------------------ #

    async def search(
        self,
        *,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        action: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        since: Optional[str] = None,
        until: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        where, params = [], {"limit": limit, "offset": offset}
        if entity_type:
            where.append("entity_type = :entity_type")
            params["entity_type"] = entity_type
        if entity_id:
            where.append("entity_id = :entity_id")
            params["entity_id"] = entity_id
        if actor_id:
            where.append("actor_id = :actor_id")
            params["actor_id"] = actor_id
        if action:
            where.append("action = :action")
            params["action"] = action
        if status:
            where.append("status = :status")
            params["status"] = status
        if severity:
            where.append("severity = :severity")
            params["severity"] = severity
        if since:
            where.append("occurred_at >= :since")
            params["since"] = since
        if until:
            where.append("occurred_at <= :until")
            params["until"] = until

        clause = f"WHERE {' AND '.join(where)}" if where else ""
        rows = (await self.session.execute(
            text(f"""
                SELECT id, seq, occurred_at, actor_type, actor_id, actor_email, actor_name,
                       actor_role, business_id, action, entity_type, entity_id, entity_label,
                       status, severity, changed_fields, before_state, after_state,
                       metadata, ip_address::text AS ip_address, user_agent, request_id,
                       http_method, http_path
                FROM audit_logs {clause}
                ORDER BY seq DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        )).mappings().all()

        total = (await self.session.execute(
            text(f"SELECT count(*) FROM audit_logs {clause}"),
            {k: v for k, v in params.items() if k not in ("limit", "offset")},
        )).scalar()

        return {"items": [dict(r) for r in rows], "total": int(total or 0),
                "limit": limit, "offset": offset}

    async def history_for(self, entity_type: str, entity_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = (await self.session.execute(
            text("""
                SELECT id, seq, occurred_at, actor_type, actor_id, actor_email, actor_name,
                       actor_role, action, entity_type, entity_id, entity_label,
                       status, severity, changed_fields, before_state, after_state, metadata
                FROM audit_logs
                WHERE entity_type = :et AND entity_id = :eid
                ORDER BY seq DESC LIMIT :limit
            """),
            {"et": entity_type, "eid": entity_id, "limit": limit},
        )).mappings().all()
        return [dict(r) for r in rows]
