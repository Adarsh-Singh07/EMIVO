import secrets
import json
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.hash import argon2
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import DomainException
from core.redis import redis_manager
from modules.auth.schemas import TokenResponse, UserCreate, UserLogin
from modules.users.models import User, BusinessMember, RoleType


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pwd_context = argon2
        self.redis = redis_manager.client

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def create_access_token(
        self, subject: str, roles: list[str], business_id: str = None
    ) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_expiration_minutes
        )
        to_encode = {
            "exp": expire,
            "sub": str(subject),
            "roles": roles,
            "jti": secrets.token_hex(16),
        }
        if business_id:
            to_encode["business_id"] = business_id

        encoded_jwt = jwt.encode(
            to_encode, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm
        )
        return encoded_jwt

    async def register_user(self, data: UserCreate) -> dict:
        stmt = select(User).where(User.email == data.email)
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            raise DomainException("Email already registered", code="EMAIL_TAKEN")

        user = User(
            email=data.email,
            password_hash=self.get_password_hash(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            is_active=True,
            is_email_verified=False
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def authenticate_user(self, data: UserLogin) -> TokenResponse:
        stmt = select(User).where(User.email == data.email)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not self.verify_password(data.password, user.password_hash):
            # To prevent timing attacks, always hash a dummy password if user not found, though passlib often handles this.
            raise DomainException("Invalid credentials", code="UNAUTHORIZED", status_code=401)
            
        if user.deleted_at is not None:
            raise DomainException("Account no longer exists", code="UNAUTHORIZED", status_code=401)

        if not user.is_active:
            raise DomainException("Account is disabled", code="FORBIDDEN", status_code=401)

        return await self._issue_tokens(user)
        
    async def _issue_tokens(self, user: User, family_id: str = None) -> TokenResponse:
        # Set RLS context so the business_members query is allowed
        await self.session.execute(
            text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user.id)}
        )
        
        # Load user roles from database (BusinessMember)
        stmt = select(BusinessMember).where(BusinessMember.user_id == user.id)
        result = await self.session.execute(stmt)
        memberships = result.scalars().all()
        
        # Collect roles
        roles = [m.role for m in memberships]
        if not roles:
            roles = [RoleType.CUSTOMER]

            
        access_token = self.create_access_token(subject=user.id, roles=roles)
        
        # Generate Refresh Token
        if not family_id:
            family_id = secrets.token_hex(16)
            
        token_value = secrets.token_hex(32)
        refresh_token = f"{family_id}:{token_value}"
        
        redis_key = f"auth:family:{family_id}"
        ttl_seconds = settings.refresh_token_expiration_days * 24 * 60 * 60
        
        await self.redis.hset(redis_key, mapping={
            "token": refresh_token,
            "user_id": user.id
        })
        await self.redis.expire(redis_key, ttl_seconds)
        
        # Track family for user (to allow revoking all sessions)
        user_families_key = f"auth:user:{user.id}:families"
        await self.redis.sadd(user_families_key, family_id)
        await self.redis.expire(user_families_key, ttl_seconds)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.jwt_expiration_minutes * 60,
        )

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        try:
            family_id, token_value = refresh_token.split(":")
        except ValueError:
            raise DomainException("Invalid refresh token format", code="UNAUTHORIZED", status_code=401)
            
        redis_key = f"auth:family:{family_id}"
        family_data = await self.redis.hgetall(redis_key)
        
        if not family_data:
            raise DomainException("Invalid or expired refresh token", code="UNAUTHORIZED", status_code=401)
            
        stored_token = family_data.get("token")
        user_id = family_data.get("user_id")
        
        if stored_token != refresh_token:
            # REPLAY DETECTED! Token was already used and rotated. Invalidate entire family.
            await self.redis.delete(redis_key)
            if user_id:
                await self.redis.srem(f"auth:user:{user_id}:families", family_id)
            raise DomainException("Token reuse detected. Session invalidated.", code="UNAUTHORIZED", status_code=401)
            
        # Token is valid. Issue new pair.
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise DomainException("User is inactive or deleted", code="UNAUTHORIZED", status_code=401)
            
        return await self._issue_tokens(user, family_id=family_id)

    async def logout(self, refresh_token: str) -> None:
        try:
            family_id, _ = refresh_token.split(":")
            redis_key = f"auth:family:{family_id}"
            family_data = await self.redis.hgetall(redis_key)
            if family_data:
                user_id = family_data.get("user_id")
                await self.redis.delete(redis_key)
                if user_id:
                    await self.redis.srem(f"auth:user:{user_id}:families", family_id)
        except ValueError:
            pass # Invalid format, nothing to revoke

    # ------------------------------------------------------------------ #
    # Password reset (token in Redis, emailed via outbox)                   #
    # ------------------------------------------------------------------ #

    async def forgot_password(self, email: str) -> None:
        """Always succeeds silently (no user enumeration). When the account
        exists, a single-use 30-minute reset token is stored in Redis and a
        reset email is enqueued through the outbox."""
        from core.models import OutboxEvent

        await self.session.execute(
            text("SELECT set_config('app.user_id', '', true)")
        )
        stmt = select(User).where(User.email == email.lower())
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            return

        token = secrets.token_urlsafe(32)
        await self.redis.set(f"auth:reset:{token}", str(user.id), ex=30 * 60)

        self.session.add(OutboxEvent(
            tenant_id=None,
            type="auth.password_reset",
            payload={
                "user_id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "token": token,
            },
        ))
        await self.session.commit()

    async def reset_password(self, token: str, new_password: str) -> None:
        user_id = await self.redis.get(f"auth:reset:{token}")
        if not user_id:
            raise DomainException(
                "Invalid or expired reset token", code="BAD_REQUEST", status_code=400
            )

        await self.session.execute(
            text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user_id)}
        )
        result = await self.session.execute(select(User).where(User.id == str(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise DomainException("Account not found", code="NOT_FOUND", status_code=404)

        user.password_hash = self.get_password_hash(new_password)
        await self.session.commit()

        # Single use + revoke every active session
        await self.redis.delete(f"auth:reset:{token}")
        await self._revoke_all_sessions(str(user_id))

    async def _revoke_all_sessions(self, user_id: str) -> None:
        families = await self.redis.smembers(f"auth:user:{user_id}:families")
        for family_id in families or []:
            await self.redis.delete(f"auth:family:{family_id}")
        await self.redis.delete(f"auth:user:{user_id}:families")

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not self.verify_password(current_password, user.password_hash):
            raise DomainException(
                "Current password is incorrect", code="BAD_REQUEST", status_code=400
            )
        await self.session.execute(
            text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user.id)}
        )
        user.password_hash = self.get_password_hash(new_password)
        await self.session.commit()
        await self._revoke_all_sessions(str(user.id))
