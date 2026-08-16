from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, set_db_context
from modules.users.models import User
from modules.wishlist.schemas import WishlistItemResponse, WishlistResponse
from modules.wishlist.service import WishlistService

router = APIRouter(prefix="/api/v1/wishlist", tags=["wishlist"])


def _service(session: AsyncSession = Depends(set_db_context)) -> WishlistService:
    return WishlistService(session)


@router.get("", response_model=WishlistResponse)
async def get_wishlist(
    service: WishlistService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    return await service.list_wishlist(current_user)


@router.post("/{product_id}", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    product_id: str,
    service: WishlistService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    return await service.add(current_user, product_id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_id: str,
    service: WishlistService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    await service.remove(current_user, product_id)
