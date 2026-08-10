
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from modules.businesses.models import Business
from modules.businesses.repository import BusinessRepository
from modules.businesses.schemas import BusinessCreate, BusinessResponse, BusinessUpdate
from modules.businesses.service import BusinessService

router = APIRouter(prefix="/businesses", tags=["Businesses"])

def get_business_service(db: AsyncSession = Depends(get_db_session)) -> BusinessService:
    repo = BusinessRepository(db)
    return BusinessService(repo)

@router.get("/", response_model=list[BusinessResponse])
async def list_businesses(db: AsyncSession = Depends(get_db_session)):
    stmt = select(Business).where(Business.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    data: BusinessCreate, 
    service: BusinessService = Depends(get_business_service)
):
    return await service.create_business(data)

@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(
    business_id: str, 
    service: BusinessService = Depends(get_business_service)
):
    return await service.get_business(business_id)

@router.put("/{business_id}", response_model=BusinessResponse)
async def update_business(
    business_id: str, 
    data: BusinessUpdate, 
    service: BusinessService = Depends(get_business_service)
):
    return await service.update_business(business_id, data)

@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(
    business_id: str, 
    service: BusinessService = Depends(get_business_service)
):
    await service.delete_business(business_id)
