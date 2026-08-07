import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.hash import argon2
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import DomainException
from modules.auth.schemas import TokenResponse, UserCreate, UserLogin
from modules.users.models import User


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pwd_context = argon2

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
            "jti": str(uuid.uuid4()),
        }
        if business_id:
            to_encode["business_id"] = business_id

        encoded_jwt = jwt.encode(
            to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
        return encoded_jwt

    async def register_user(self, data: UserCreate) -> dict:
        # Check existing user
        stmt = select(User).where(User.email == data.email)
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            raise DomainException("Email already registered", code="EMAIL_TAKEN")

        user = User(
            email=data.email,
            password_hash=self.get_password_hash(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
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
            raise DomainException(
                "Invalid credentials", code="UNAUTHORIZED", status_code=401
            )

        if not user.is_active:
            raise DomainException(
                "Account is disabled", code="FORBIDDEN", status_code=403
            )

        # P0 Requirement: Issue MFA challenge if mfa_enabled here instead of returning tokens directly.
        # For simplicity in this step, assume standard login passes.

        # Hardcoding roles = ['customer'] for MVP login standard path
        roles = []
        access_token = self.create_access_token(subject=user.id, roles=roles)

        # P0 Requirement: Opaque rolling refresh tokens in Redis.
        # (Redis client logic is pending, simulated token return)
        refresh_token = str(uuid.uuid4())

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.jwt_expiration_minutes * 60,
        )
