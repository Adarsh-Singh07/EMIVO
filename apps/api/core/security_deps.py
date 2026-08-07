from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from core.config import settings
from core.database import tenant_context

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_payload(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    return verify_token(token)


def require_permissions(required_roles: list[str]) -> Callable:
    def role_checker(
        payload: dict[str, Any] = Depends(get_current_user_payload),
    ) -> dict[str, Any]:
        user_roles = payload.get("roles", [])

        # Super simple check for now logic
        has_access = any(role in required_roles for role in user_roles)
        if not has_access and "platform_admin" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )

        business_id = payload.get("business_id")
        if business_id:
            tenant_context.set(business_id)

        return payload

    return role_checker
