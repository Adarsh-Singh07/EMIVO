from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, get_db_session
from core.models import OutboxEvent
from modules.auth.schemas import (
    TokenResponse, UserCreate, UserLogin, UserResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
)
from modules.auth.service import AuthService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


async def get_auth_service(
    session: AsyncSession = Depends(get_db_session),
) -> AuthService:
    return AuthService(session)


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(data: UserCreate, service: AuthService = Depends(get_auth_service)):
    user = await service.register_user(data)
    # Welcome email (best-effort, delivered by the outbox worker)
    session = service.session
    session.add(OutboxEvent(
        tenant_id=None,
        type="auth.welcome",
        payload={
            "user_id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
        },
    ))
    await session.commit()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, service: AuthService = Depends(get_auth_service)):
    return await service.authenticate_user(data)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshTokenRequest, service: AuthService = Depends(get_auth_service)):
    return await service.refresh_token(data.refresh_token)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshTokenRequest, service: AuthService = Depends(get_auth_service)):
    await service.logout(data.refresh_token)


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    data: ForgotPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Always returns 202 — never reveals whether an account exists."""
    await service.forgot_password(data.email)
    return {"status": "accepted"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    data: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    await service.reset_password(data.token, data.new_password)
    return {"status": "password_updated"}


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    data: ChangePasswordRequest,
    service: AuthService = Depends(get_auth_service),
    current_user: User = Depends(get_current_user),
):
    await service.change_password(current_user, data.current_password, data.new_password)
    return {"status": "password_updated"}
