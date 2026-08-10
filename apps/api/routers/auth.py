from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(payload: dict[str, Any], db: AsyncSession = Depends(get_db_session)):
    # Basic dummy logic since we are keeping models purely via python dictionary mapping
    return {"message": "User registered", "user": payload, "needs_otp": True}

@router.post("/login")
async def login(payload: dict[str, Any], db: AsyncSession = Depends(get_db_session)):
    skip_otp = payload.get("skip_otp", False)
    if skip_otp:
        return {"access_token": "dummy_access_token", "refresh_token": "dummy_refresh", "needs_otp": False}
    return {"message": "OTP sent", "needs_otp": True}

@router.post("/verify-otp")
async def verify_otp(payload: dict[str, Any], db: AsyncSession = Depends(get_db_session)):
    return {"access_token": "dummy_access_token", "refresh_token": "dummy_refresh"}

