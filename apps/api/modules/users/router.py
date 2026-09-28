from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.dependencies import get_db_session, get_current_user
from modules.users.schemas import UserResponse, UserUpdate
from modules.users.service import UserService
from modules.users.models import User
from core.exceptions import DomainException

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

async def get_user_service(session: AsyncSession = Depends(get_db_session)) -> UserService:
    return UserService(session)

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user), 
    service: UserService = Depends(get_user_service)
):
    return await service.get_user_by_id(current_user.id)

@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user), 
    service: UserService = Depends(get_user_service)
):
    return await service.update_user(current_user.id, data)

@router.delete("/me", status_code=204)
async def delete_my_account(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Self-service account removal. Personal data is anonymized and sign-in
    is disabled; order and payment history is retained for business records
    (as required by the store's order bookkeeping)."""
    from modules.admin.service import AdminService

    await AdminService(session).delete_user(str(user.id))
