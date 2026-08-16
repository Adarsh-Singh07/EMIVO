from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.dependencies import get_current_user, set_db_context
from modules.addresses.schemas import AddressCreate, AddressListResponse, AddressResponse, AddressUpdate
from modules.addresses.service import AddressService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/addresses", tags=["addresses"])


def _service(session: AsyncSession = Depends(set_db_context)) -> AddressService:
    return AddressService(session)


@router.get("", response_model=AddressListResponse)
async def list_addresses(
    service: AddressService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    items = await service.list_addresses(str(current_user.id))
    return AddressListResponse(items=items)


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: AddressCreate,
    service: AddressService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    return await service.create_address(str(current_user.id), payload)


@router.put("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: str,
    payload: AddressUpdate,
    service: AddressService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_address(str(current_user.id), address_id, payload)


@router.post("/{address_id}/default", response_model=AddressResponse)
async def set_default_address(
    address_id: str,
    service: AddressService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    return await service.set_default(str(current_user.id), address_id)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: str,
    service: AddressService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    await service.delete_address(str(current_user.id), address_id)
