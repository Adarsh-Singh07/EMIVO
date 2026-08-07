from core.dependencies import get_db_session
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security_deps import get_current_user_id
from modules.orders.repository import OrderRepository
from modules.orders.schemas import OrderCreate, OrderResponse, OrderStatusUpdate
from modules.orders.service import OrderService

router = APIRouter(prefix="/v1/orders", tags=["Orders"])


async def get_order_service(
    session: AsyncSession = Depends(get_db_session),
) -> OrderService:
    repo = OrderRepository(session)
    return OrderService(repo)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    user_id: str = Depends(get_current_user_id),
    service: OrderService = Depends(get_order_service),
):
    return await service.create_order(user_id, data)


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    limit: int = 20,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id),
    service: OrderService = Depends(get_order_service),
):
    return await service.get_user_orders(user_id, limit, offset)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    user_id: str = Depends(get_current_user_id),
    service: OrderService = Depends(get_order_service),
):
    return await service.get_order(order_id, user_id)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    user_id: str = Depends(get_current_user_id),
    service: OrderService = Depends(get_order_service),
):
    # Depending on business logic, this might be restricted to specific roles, but implemented for user for MVP
    return await service.update_status(order_id, user_id, data)
