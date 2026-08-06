from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import db
from modules.businesses.schemas import BusinessResponse, BusinessCreate, BusinessUpdate
from modules.businesses.repository import BusinessRepository
from modules.businesses.service import BusinessService

router = APIRouter(prefix="/v1/businesses", tags=["Businesses"])

# DI provider logic to be refined with proper FastAPI dependencies
# For MVP, this assumes db returns an async generator
# The integration of SQLAlchemy AsyncSession with our db.get_connection will be structured properly in deps.py

# In core/dependencies.py we will implement:
# async def get_session() -> AsyncSession

from core.dependencies import get_db_session
async def get_business_service(session: AsyncSession = Depends(get_db_session)) -> BusinessService:
    repo = BusinessRepository(session)
    return BusinessService(repo)

@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(data: BusinessCreate, service: BusinessService = Depends(get_business_service)):
    return await service.create_business(data)

@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(business_id: str, service: BusinessService = Depends(get_business_service)):
    return await service.get_business(business_id)

@router.patch("/{business_id}", response_model=BusinessResponse)
async def update_business(business_id: str, data: BusinessUpdate, service: BusinessService = Depends(get_business_service)):
    return await service.update_business(business_id, data)

@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(business_id: str, service: BusinessService = Depends(get_business_service)):
    await service.delete_business(business_id)

