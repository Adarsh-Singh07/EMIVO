from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_db_session
from modules.auth.schemas import TokenResponse, UserCreate, UserLogin, UserResponse, RefreshTokenRequest
from modules.auth.service import AuthService

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
