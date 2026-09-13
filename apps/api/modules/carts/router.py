from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, get_optional_user, optional_db_context, set_db_context
from core.exceptions import DomainException
from modules.carts.models import Cart
from modules.carts.schemas import CartItemCreate, CartItemUpdate, CartResponse
from modules.carts.service import CartService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/carts", tags=["carts"])


async def get_cart_service(
    session: AsyncSession = Depends(set_db_context)
) -> CartService:
    return CartService(session)


async def get_public_cart_service(
    session: AsyncSession = Depends(optional_db_context)
) -> CartService:
    return CartService(session)


async def _owned_cart(
    cart_id: str,
    service: CartService,
    current_user: Optional[User],
    cart_session: Optional[str],
) -> Cart:
    """IDOR guard: a cart is accessible only by its owner — an authenticated
    user's own cart, or a guest cart whose session token matches."""
    cart = await service.repository.get_by_id(cart_id)
    if not cart:
        raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)
    if current_user:
        if cart.user_id and str(cart.user_id) != str(current_user.id):
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)
        # Guest carts require the CORRECT session token, not merely any
        # non-empty one (a truthiness-only check would let any authenticated
        # user who learns a guest cart id read/mutate it with junk headers).
        if cart.user_id is None and (not cart_session or cart.session_id != cart_session):
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)
    else:
        if cart.user_id is not None:
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)
        if not cart_session or cart.session_id != cart_session:
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)
    return cart


# Guest session tokens are client-generated, but must be opaque and have
# minimum entropy: 16–64 chars of [A-Za-z0-9_-]. This rejects degenerate
# values like "X-Cart-Session: 1" (trivially guessable / enumerable) while
# staying compatible with existing clients ("guest-<hex>",
# "crypto.randomUUID()").
import re as _re
_SESSION_RE = _re.compile(r"^[A-Za-z0-9_-]{16,64}$")


def _validate_guest_session(session_id: Optional[str]) -> Optional[str]:
    if session_id is None:
        return None
    if not _SESSION_RE.match(session_id):
        raise DomainException(
            "Invalid cart session token", code="BAD_REQUEST", status_code=400,
        )
    return session_id


@router.get("", response_model=CartResponse)
async def get_or_create_cart(
    session_id: Optional[str] = Query(None),
    x_cart_session: Optional[str] = Header(default=None, alias="X-Cart-Session"),
    service: CartService = Depends(get_public_cart_service),
    current_user: Optional[User] = Depends(get_optional_user),
) -> Any:
    """Get or create the active cart. Authenticated users get their server
    cart; guests get a session-scoped cart (X-Cart-Session header/query)."""
    guest_session = _validate_guest_session(session_id or x_cart_session)
    user_id = str(current_user.id) if current_user else None
    if not user_id and not guest_session:
        raise DomainException(
            "Provide X-Cart-Session header for guest carts",
            code="BAD_REQUEST", status_code=400,
        )
    return await service.get_or_create_cart(user_id=user_id, session_id=guest_session)


@router.post("/merge", response_model=CartResponse)
async def merge_guest_cart(
    payload: "MergeRequest",
    service: CartService = Depends(get_cart_service),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Merge the guest session cart into the authenticated user's cart
    (called right after login). Quantities of identical products add up."""
    return await service.merge_guest_cart(
        user_id=str(current_user.id),
        session_id=_validate_guest_session(payload.session_id),
    )


class MergeRequest(BaseModel):
    session_id: str


@router.get("/{cart_id}", response_model=CartResponse)
async def get_cart(
    cart_id: str,
    x_cart_session: Optional[str] = Header(default=None, alias="X-Cart-Session"),
    service: CartService = Depends(get_public_cart_service),
    current_user: Optional[User] = Depends(get_optional_user),
) -> Any:
    """Get cart details by ID (ownership enforced)."""
    await _owned_cart(cart_id, service, current_user, x_cart_session)
    return await service.get_cart(cart_id=cart_id)


@router.post(
    "/{cart_id}/items",
    response_model=CartResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_item_to_cart(
    cart_id: str,
    item: CartItemCreate,
    x_cart_session: Optional[str] = Header(default=None, alias="X-Cart-Session"),
    service: CartService = Depends(get_public_cart_service),
    current_user: Optional[User] = Depends(get_optional_user),
) -> Any:
    """Add an item to cart with live stock validation and price recalculation."""
    await _owned_cart(cart_id, service, current_user, x_cart_session)
    return await service.add_item(cart_id=cart_id, item_data=item)


@router.patch("/{cart_id}/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    cart_id: str,
    item_id: str,
    item_update: CartItemUpdate,
    x_cart_session: Optional[str] = Header(default=None, alias="X-Cart-Session"),
    service: CartService = Depends(get_public_cart_service),
    current_user: Optional[User] = Depends(get_optional_user),
) -> Any:
    """Update item quantity (stock-validated) and recalculate subtotal."""
    await _owned_cart(cart_id, service, current_user, x_cart_session)
    return await service.update_item_quantity(
        cart_id=cart_id, item_id=item_id, update_data=item_update
    )


@router.delete("/{cart_id}/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    cart_id: str,
    item_id: str,
    x_cart_session: Optional[str] = Header(default=None, alias="X-Cart-Session"),
    service: CartService = Depends(get_public_cart_service),
    current_user: Optional[User] = Depends(get_optional_user),
) -> Any:
    """Remove an item from cart and recalculate subtotal."""
    await _owned_cart(cart_id, service, current_user, x_cart_session)
    return await service.remove_item(cart_id=cart_id, item_id=item_id)


@router.post("/{cart_id}/clear", response_model=CartResponse)
async def clear_cart(
    cart_id: str,
    x_cart_session: Optional[str] = Header(default=None, alias="X-Cart-Session"),
    service: CartService = Depends(get_public_cart_service),
    current_user: Optional[User] = Depends(get_optional_user),
) -> Any:
    """Clear all items from cart."""
    await _owned_cart(cart_id, service, current_user, x_cart_session)
    return await service.clear_cart(cart_id=cart_id)
