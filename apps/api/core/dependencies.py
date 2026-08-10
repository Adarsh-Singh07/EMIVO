from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional, List, Callable
from jose import jwt, JWTError

from core.database import get_db_session
from core.config import settings
from core.exceptions import DomainException
from modules.users.models import User, BusinessMember

security = HTTPBearer()

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

def require_roles(allowed_roles: List[str]) -> Callable:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = current_user._token_payload.get("roles", [])
        if not any(role in allowed_roles for role in user_roles):
            raise DomainException("Insufficient permissions", code="FORBIDDEN", status_code=403)
        return current_user
    return role_checker

async def set_db_context(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
) -> AsyncSession:
    """
    Set PostgreSQL session variables for RLS enforcement.
    Must be called before any query that is governed by RLS policies.

    Always sets app.user_id first so business_members RLS is satisfied,
    then sets app.business_id for tenant isolation.
    """
    # Always set user_id first — required for business_members RLS SELECT
    await session.execute(
        text(f"SELECT set_config('app.user_id', '{current_user.id}', true)")
    )

    # Prefer business_id from JWT payload (set during login if user selects a business)
    business_id = current_user._token_payload.get("business_id")

    if not business_id:
        # Fall back to the user's first active membership
        # app.user_id is now set, so RLS allows this query
        stmt = (
            select(BusinessMember.business_id)
            .where(BusinessMember.user_id == current_user.id)
            .order_by(BusinessMember.created_at)
            .limit(1)
        )
        res = await session.execute(stmt)
        business_id = res.scalar()

    if business_id:
        await session.execute(
            text(f"SELECT set_config('app.business_id', '{business_id}', true)")
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
    Sets RLS session vars when user is present; skips when anonymous."""
    if current_user is not None:
        await session.execute(
            text(f"SELECT set_config('app.user_id', '{current_user.id}', true)")
        )
        business_id = current_user._token_payload.get("business_id")
        if not business_id:
            stmt = (
                select(BusinessMember.business_id)
                .where(BusinessMember.user_id == current_user.id)
                .order_by(BusinessMember.created_at)
                .limit(1)
            )
            res = await session.execute(stmt)
            business_id = res.scalar()
        if business_id:
            await session.execute(
                text(f"SELECT set_config('app.business_id', '{business_id}', true)")
            )
    return session
