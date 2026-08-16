from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional, List, Callable
from jose import jwt, JWTError

from core.database import get_db_session
from core.config import settings
from core.exceptions import DomainException
from core.store import get_store_business_id
from modules.users.models import User, BusinessMember, RoleType

security = HTTPBearer()

STAFF_ROLES = (RoleType.PLATFORM_ADMIN, RoleType.OWNER, RoleType.STAFF)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db_session)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise DomainException("Invalid token payload", code="UNAUTHORIZED", status_code=401)
    except JWTError:
        raise DomainException("Invalid authentication credentials", code="UNAUTHORIZED", status_code=401)

    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise DomainException("User not found", code="UNAUTHORIZED", status_code=401)

    if not user.is_active:
        raise DomainException("Inactive user", code="FORBIDDEN", status_code=403)

    # Bind the decoded payload to the user for role checks downstream
    user._token_payload = payload

    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise DomainException("Inactive user", code="FORBIDDEN", status_code=403)
    return current_user


def _is_staff_payload(payload: dict) -> bool:
    roles = payload.get("roles", []) or []
    return any(r in STAFF_ROLES for r in roles)


def require_roles(allowed_roles: List[str]) -> Callable:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = current_user._token_payload.get("roles", [])
        if not any(role in allowed_roles for role in user_roles):
            raise DomainException("Insufficient permissions", code="FORBIDDEN", status_code=403)
        return current_user
    return role_checker


async def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Admin-portal guard: server-side role enforcement for staff-level APIs."""
    if not _is_staff_payload(current_user._token_payload):
        raise DomainException("Staff access required", code="FORBIDDEN", status_code=403)
    return current_user


async def set_db_context(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
) -> AsyncSession:
    """
    Set PostgreSQL session variables for RLS enforcement.
    Must be called before any query that is governed by RLS policies.

    Sets, in order:
      - app.user_id  (always; satisfies business_members RLS)
      - app.role     (highest role from the JWT — feeds elektrix_is_staff() in RLS)
      - app.business_id (JWT claim → first membership → canonical STORE business)

    The store fallback is what lets plain customers (no business membership)
    operate on storefront carts/orders within the store tenant.
    """
    await session.execute(
        text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(current_user.id)}
    )

    roles = current_user._token_payload.get("roles", []) or []
    top_role = next((r for r in STAFF_ROLES if r in roles), RoleType.CUSTOMER)
    await session.execute(
        text("SELECT set_config('app.role', :role, true)"), {"role": top_role}
    )

    # Prefer business_id from JWT payload (set during login if user selects a business)
    business_id = current_user._token_payload.get("business_id")

    if not business_id:
        # Fall back to the user's first active membership (staff/owners)
        stmt = (
            select(BusinessMember.business_id)
            .where(BusinessMember.user_id == current_user.id)
            .order_by(BusinessMember.created_at)
            .limit(1)
        )
        res = await session.execute(stmt)
        business_id = res.scalar()

    if not business_id:
        # Storefront customers: scope to the canonical store tenant
        business_id = await get_store_business_id(session)

    await session.execute(
        text("SELECT set_config('app.business_id', :bid, true)"), {"bid": str(business_id)}
    )

    return session


# ---------------------------------------------------------------------------
# Optional auth — for public endpoints that work with or without a token
# ---------------------------------------------------------------------------

security_optional = HTTPBearer(auto_error=False)

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    session: AsyncSession = Depends(get_db_session),
) -> Optional[User]:
    """Returns the current user if a valid Bearer token is present, else None."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.is_active:
            user._token_payload = payload
            return user
    except JWTError:
        pass
    return None


async def optional_db_context(
    current_user: Optional[User] = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> AsyncSession:
    """Like set_db_context but does not require authentication.

    Anonymous sessions are scoped to the canonical store tenant so that public
    catalog reads and guest carts work under RLS.
    """
    if current_user is not None:
        return await set_db_context(current_user, session)

    store_id = await get_store_business_id(session)
    await session.execute(
        text("SELECT set_config('app.business_id', :bid, true)"), {"bid": store_id}
    )
    return session
