from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import require_roles, set_db_context
from modules.orders.models import OrderStatus
from modules.orders.schemas import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    PaginatedOrdersResponse,
)
from modules.orders.service import OrderService
from modules.users.models import User

router = APIRouter(
    prefix="/api/v1/orders",
    tags=["orders"],
)


async def get_order_service(
    session: AsyncSession = Depends(set_db_context)
) -> OrderService:
    return OrderService(session)


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_order(
    payload: OrderCreate,
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff", "customer"]))
) -> Any:
    """Create a new order. Customers can create orders too."""
    return await service.create_order(payload, current_user)


@router.get(
    "/",
    response_model=PaginatedOrdersResponse
)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    order_status: Optional[OrderStatus] = Query(None, alias="status"),
    customer_id: Optional[str] = Query(None),
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff", "customer"]))
) -> Any:
    """List orders with pagination. Customers are scoped to their own orders only."""
    roles = current_user._token_payload.get("roles", [])
    user_id_filter = None
    if "customer" in roles and not any(r in ["platform_admin", "owner", "staff"] for r in roles):
        user_id_filter = current_user.id
        customer_id = None

    return await service.list_orders(
        status=order_status,
        customer_id=customer_id,
        user_id=user_id_filter,
        page=page,
        page_size=page_size
    )


@router.get(
    "/{order_id}",
    response_model=OrderResponse
)
async def get_order(
    order_id: str,
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff", "customer"]))
) -> Any:
    """Retrieve a single order by ID. Customers can only view their own orders."""
    order = await service.get_order(order_id)
    roles = current_user._token_payload.get("roles", [])
    if "customer" in roles and not any(r in ["platform_admin", "owner", "staff"] for r in roles):
        if order.user_id != current_user.id:
            from core.exceptions import DomainException
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)
    return order



@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse
)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"]))
) -> Any:
    """Update order status with state transition validation."""
    return await service.update_order_status(order_id, payload)


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_order(
    order_id: str,
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner"]))
) -> None:
    """Soft delete / cancel an order."""
    await service.delete_order(order_id)
