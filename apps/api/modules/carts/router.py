from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import set_db_context
from modules.carts.schemas import CartItemCreate, CartItemUpdate, CartResponse
from modules.carts.service import CartService

router = APIRouter(prefix="/api/v1/carts", tags=["carts"])


async def get_cart_service(
    session: AsyncSession = Depends(set_db_context)
) -> CartService:
    return CartService(session)


@router.get("", response_model=CartResponse)
async def get_or_create_cart(
    user_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    service: CartService = Depends(get_cart_service),
) -> Any:
    """Get or create active cart for a user or guest session."""
    return await service.get_or_create_cart(user_id=user_id, session_id=session_id)


@router.get("/{cart_id}", response_model=CartResponse)
async def get_cart(
    cart_id: str,
    service: CartService = Depends(get_cart_service),
) -> Any:
    """Get cart details by cart ID."""
    return await service.get_cart(cart_id=cart_id)


@router.post(
    "/{cart_id}/items",
    response_model=CartResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_item_to_cart(
    cart_id: str,
    item: CartItemCreate,
    service: CartService = Depends(get_cart_service),
) -> Any:
    """Add an item or variant to cart with automatic price calculation."""
    return await service.add_item(cart_id=cart_id, item_data=item)


@router.patch("/{cart_id}/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    cart_id: str,
    item_id: str,
    item_update: CartItemUpdate,
    service: CartService = Depends(get_cart_service),
) -> Any:
    """Update item quantity in cart and recalculate subtotal."""
    return await service.update_item_quantity(
        cart_id=cart_id, item_id=item_id, update_data=item_update
    )


@router.delete("/{cart_id}/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    cart_id: str,
    item_id: str,
    service: CartService = Depends(get_cart_service),
) -> Any:
    """Remove an item from cart and recalculate subtotal."""
    return await service.remove_item(cart_id=cart_id, item_id=item_id)


@router.post("/{cart_id}/clear", response_model=CartResponse)
async def clear_cart(
    cart_id: str,
    service: CartService = Depends(get_cart_service),
) -> Any:
    """Clear all items from cart and reset subtotal to zero."""
    return await service.clear_cart(cart_id=cart_id)
