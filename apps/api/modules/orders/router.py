from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import (
    STAFF_ROLES,
    get_current_user,
    require_staff,
    set_db_context,
)
from modules.orders.models import OrderStatus
from modules.orders.schemas import (
    CheckoutRequest,
    CheckoutResponse,
    OrderResponseV2,
    OrderStatusUpdate,
    PaginatedOrdersResponseV2,
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


def _is_staff(user: User) -> bool:
    roles = user._token_payload.get("roles", []) or []
    return any(r in STAFF_ROLES for r in roles)


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def checkout(
    payload: CheckoutRequest,
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Server-authoritative checkout: resolves cart/items, recomputes prices,
    applies coupon atomically, reserves stock, creates the order. For ONLINE
    payments the response marks payment_required — the client then calls
    POST /api/v1/payments/initiate with the order id."""
    order, payment_required = await service.checkout(payload, current_user)

    payment_id = None
    if payment_required:
        from sqlalchemy import select as _select
        from modules.payments.models import Payment

        res = await service.session.execute(
            _select(Payment.id).where(Payment.order_id == str(order.id))
            .order_by(Payment.created_at.desc()).limit(1)
        )
        payment_id = res.scalar()

    return CheckoutResponse(
        order=OrderResponseV2.model_validate(order),
        payment_required=payment_required,
        payment_id=payment_id,
    )


@router.get("/", response_model=PaginatedOrdersResponseV2)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    order_status: Optional[OrderStatus] = Query(None, alias="status"),
    q: Optional[str] = Query(None, description="Search by order number (staff)"),
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List orders. Customers see only their own orders; staff see all."""
    user_id_filter = None if _is_staff(current_user) else str(current_user.id)
    return await service.list_orders(
        status=order_status,
        customer_id=None,
        user_id=user_id_filter,
        page=page,
        page_size=page_size,
    )


@router.get("/track/{order_number}", response_model=OrderResponseV2)
async def track_order_by_number(
    order_number: str,
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Order tracking by human order number (ownership enforced)."""
    return await service.get_order_by_number(order_number, current_user, _is_staff(current_user))


@router.get("/{order_id}", response_model=OrderResponseV2)
async def get_order(
    order_id: str,
    service: OrderService = Depends(get_order_service),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve a single order by ID. Customers can only view their own."""
    return await service.get_order_for_user(order_id, current_user, _is_staff(current_user))


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponseV2,
    dependencies=[Depends(require_staff)],
)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    service: OrderService = Depends(get_order_service),
) -> Any:
    """Update order status with state transition validation, inventory
    side effects and customer notifications (staff only)."""
    return await service.update_order_status(order_id, payload)


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_staff)],
)
async def delete_order(
    order_id: str,
    service: OrderService = Depends(get_order_service),
) -> None:
    """Soft delete / cancel an order (staff)."""
    await service.delete_order(order_id)
