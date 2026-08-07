from core.dependencies import get_db_session
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth.schemas import TokenResponse, UserCreate, UserLogin, UserResponse
from modules.auth.service import AuthService

router = APIRouter(prefix="/v1/auth", tags=["Auth"])


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
