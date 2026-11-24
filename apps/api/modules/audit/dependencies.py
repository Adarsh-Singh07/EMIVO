"""Actor resolution for the audit trail.

Resolves who is performing a request into an `Actor` the audit service can
record. Handles the three shapes this codebase has:

  * staff/admin  — a users row whose JWT carries a staff role
  * seller       — a sellers row (JWT sub is a seller id, not a users id)
  * anonymous    — public endpoints; recorded as `system` unless a user is
                   resolved optionally

Each resolver is intentionally tolerant: audit attribution must never be the
reason a business request fails, so a bad/absent token yields None rather than
raising.
"""
from typing import Optional

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db_session
from modules.audit.models import ActorType
from modules.audit.service import Actor

security_optional = HTTPBearer(auto_error=False)

STAFF_ROLE_NAMES = ("platform_admin", "owner", "staff")


def _request_meta(request: Optional[Request]) -> dict:
    if request is None:
        return {}
    fwd = request.headers.get("x-forwarded-for") or ""
    ip = fwd.split(",")[0].strip() if fwd else None
    if not ip and request.client:
        ip = request.client.host
    return {
        "ip_address": ip,
        "user_agent": request.headers.get("user-agent"),
        "request_id": getattr(request.state, "request_id", None),
        "http_method": request.method,
        "http_path": request.url.path,
    }


async def resolve_actor(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    session: AsyncSession = Depends(get_db_session),
) -> Actor:
    """Best-effort actor for the current request; never raises on auth issues."""
    meta = _request_meta(request)
    if credentials is None:
        return Actor(type=ActorType.SYSTEM.value, name="anonymous", **meta)

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        return Actor(type=ActorType.SYSTEM.value, name="unknown-token", **meta)

    roles = [str(r) for r in (payload.get("roles") or [])]
    sub = payload.get("sub")
    if not sub:
        return Actor(type=ActorType.SYSTEM.value, name="no-subject", **meta)

    # Staff / admin (users table)
    if any(r in STAFF_ROLE_NAMES for r in roles):
        row = (await session.execute(
            text("""
                SELECT id, email, first_name, last_name, business_id
                FROM users WHERE id = :uid
            """),
            {"uid": str(sub)},
        )).mappings().first()
        if row:
            name = " ".join(
                p for p in [row.get("first_name"), row.get("last_name")] if p
            ) or None
            top_role = next((r for r in STAFF_ROLE_NAMES if r in roles), None)
            return Actor(
                type=ActorType.ADMIN.value if top_role == "platform_admin" else ActorType.STAFF.value,
                id=str(row["id"]),
                email=row.get("email"),
                name=name,
                role=top_role,
                business_id=row.get("business_id"),
                **meta,
            )

    # Seller (sellers table)
    claimed = payload.get("seller_id") or sub
    row = (await session.execute(
        text("""
            SELECT id, email, business_name, name
            FROM sellers WHERE id = :sid
        """),
        {"sid": str(claimed)},
    )).mappings().first()
    if row:
        return Actor(
            type=ActorType.SELLER.value,
            id=str(row["id"]),
            email=row.get("email"),
            name=row.get("business_name") or row.get("name"),
            role="seller",
            **meta,
        )

    # Customer (users table, non-staff)
    row = (await session.execute(
        text("SELECT id, email, first_name, last_name FROM users WHERE id = :uid"),
        {"uid": str(sub)},
    )).mappings().first()
    if row:
        name = " ".join(p for p in [row.get("first_name"), row.get("last_name")] if p) or None
        return Actor(
            type=ActorType.USER.value,
            id=str(row["id"]),
            email=row.get("email"),
            name=name,
            role="customer",
            **meta,
        )

    return Actor(type=ActorType.SYSTEM.value, name="unresolved", **meta)
