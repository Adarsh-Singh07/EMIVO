from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from core.database import get_db

from .schemas import Cart, CartItemCreate, CartItemUpdate
from .service import CartService

router = APIRouter(prefix="/carts", tags=["carts"])


@router.get("", response_model=Cart)
def get_or_create_cart(
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    user_id: str | None = Query(None),
    session_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get or create active cart for a user or guest session
    """
    service = CartService(db)
    return service.get_or_create_cart(
        tenant_id=x_tenant_id, user_id=user_id, session_id=session_id
    )


@router.get("/{cart_id}", response_model=Cart)
def get_cart(
    cart_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Get cart details by cart ID
    """
    service = CartService(db)
    return service.get_cart(cart_id=cart_id, tenant_id=x_tenant_id)


@router.post(
    "/{cart_id}/items", response_model=Cart, status_code=status.HTTP_201_CREATED
)
def add_item_to_cart(
    cart_id: str,
    item: CartItemCreate,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Add an item or variant to cart
    """
    service = CartService(db)
    return service.add_item(cart_id=cart_id, tenant_id=x_tenant_id, item_data=item)


@router.patch("/{cart_id}/items/{item_id}", response_model=Cart)
def update_cart_item(
    cart_id: str,
    item_id: str,
    item_update: CartItemUpdate,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Update item quantity in cart
    """
    service = CartService(db)
    return service.update_item_quantity(
        cart_id=cart_id, item_id=item_id, tenant_id=x_tenant_id, update_data=item_update
    )


@router.delete("/{cart_id}/items/{item_id}", response_model=Cart)
def remove_cart_item(
    cart_id: str,
    item_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Remove an item from cart
    """
    service = CartService(db)
    return service.remove_item(cart_id=cart_id, item_id=item_id, tenant_id=x_tenant_id)


@router.delete("/{cart_id}/clear", response_model=Cart)
def clear_cart(
    cart_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    db: Session = Depends(get_db),
):
    """
    Clear all items from cart
    """
    service = CartService(db)
    return service.clear_cart(cart_id=cart_id, tenant_id=x_tenant_id)
