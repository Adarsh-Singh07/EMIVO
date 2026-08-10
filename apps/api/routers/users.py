
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
async def get_me(db: AsyncSession = Depends(get_db_session)):
    return {"id": "dummy-user-123", "first_name": "Admin", "last_name": "User", "phone": "1234567890"}

