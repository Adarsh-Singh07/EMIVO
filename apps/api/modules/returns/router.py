from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import (
    STAFF_ROLES,
    get_current_user,
    get_seller_db_context,
    require_staff,
    set_db_context,
)
from modules.audit.dependencies import resolve_actor
from modules.audit.service import Actor
from modules.returns.schemas import (
    AdminReturnRequestCreate,
    PaginatedReturnRequestsResponse,
    ReturnApproveRequest,
    ReturnCloseRequest,
    ReturnMarkReceivedRequest,
    ReturnRefundRequest,
    ReturnRejectRequest,
    ReturnRequestCreate,
    ReturnRequestResponse,
    ReturnSchedulePickupRequest,
)
from modules.returns.service import ReturnService
from modules.sellers.models import Seller
from modules.sellers.router import get_current_seller
from modules.users.models import User

router = APIRouter(prefix="/api/v1", tags=["returns"])


def _service(session: AsyncSession = Depends(set_db_context)) -> ReturnService:
    return ReturnService(session)


def _seller_service(session: AsyncSession = Depends(get_seller_db_context)) -> ReturnService:
    return ReturnService(session)


def _is_staff(user: User) -> bool:
    roles = getattr(user, "_token_payload", {}).get("roles", []) or []
    return any(r in STAFF_ROLES for r in roles)


# ------------------------------------------------------------------ #
# Customer endpoints                                                   #
# ------------------------------------------------------------------ #


@router.post(
    "/orders/{order_id}/return-requests",
    response_model=ReturnRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_return_request(
    order_id: str,
    payload: ReturnRequestCreate,
    service: ReturnService = Depends(_service),
    current_user: User = Depends(get_current_user),
    actor: Actor = Depends(resolve_actor),
):
    """Customer initiates a return request for a delivered order item within 7 days."""
    return await service.create_return_request(
        order_id,
        payload,
        actor_user_id=str(current_user.id),
        is_staff=_is_staff(current_user),
        actor=actor,
    )


@router.get("/orders/{order_id}/return-requests", response_model=PaginatedReturnRequestsResponse)
async def list_order_return_requests(
    order_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    """List return requests on one order (customer sees own; staff sees all)."""
    if _is_staff(current_user):
        return await service.list_admin_returns(order_id=order_id, page=page, page_size=page_size)
    return await service.list_customer_returns(
        str(current_user.id), order_id=order_id, page=page, page_size=page_size
    )


@router.get("/return-requests", response_model=PaginatedReturnRequestsResponse)
async def list_my_return_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    """Customer lists all their own return requests."""
    return await service.list_customer_returns(
        str(current_user.id), page=page, page_size=page_size
    )


@router.get("/return-requests/{return_id}", response_model=ReturnRequestResponse)
async def get_return_request(
    return_id: str,
    service: ReturnService = Depends(_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_return(
        return_id, user_id=str(current_user.id), is_staff=_is_staff(current_user)
    )


@router.post("/return-requests/{return_id}/close", response_model=ReturnRequestResponse)
async def close_return_request(
    return_id: str,
    payload: ReturnCloseRequest = ReturnCloseRequest(),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(get_current_user),
    actor: Actor = Depends(resolve_actor),
):
    """Customer withdraws a REQUESTED return, or staff closes a return request."""
    return await service.close(
        return_id,
        payload,
        actor_user_id=str(current_user.id),
        is_staff=_is_staff(current_user),
        actor=actor,
    )


# ------------------------------------------------------------------ #
# Seller endpoints                                                     #
# ------------------------------------------------------------------ #


@router.get("/seller/return-requests", response_model=PaginatedReturnRequestsResponse)
async def list_seller_return_requests(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    seller: Seller = Depends(get_current_seller),
    service: ReturnService = Depends(_seller_service),
):
    """Seller views return requests filed against their own items."""
    return await service.list_seller_returns(
        seller_id=str(seller.id),
        status=status,
        q=q,
        page=page,
        page_size=page_size,
    )


# ------------------------------------------------------------------ #
# Admin / Staff endpoints                                              #
# ------------------------------------------------------------------ #


@router.get(
    "/admin/return-requests",
    response_model=PaginatedReturnRequestsResponse,
    dependencies=[Depends(require_staff)],
)
async def admin_list_return_requests(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: ReturnService = Depends(_service),
):
    return await service.list_admin_returns(
        status=status, q=q, order_id=order_id, page=page, page_size=page_size
    )


@router.post(
    "/admin/return-requests",
    response_model=ReturnRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_return_request(
    payload: AdminReturnRequestCreate,
    service: ReturnService = Depends(_service),
    current_user: User = Depends(require_staff),
    actor: Actor = Depends(resolve_actor),
):
    """Staff initiates a return request on behalf of a customer."""
    return await service.create_return_request(
        payload.order_id,
        payload,
        actor_user_id=str(current_user.id),
        is_staff=True,
        actor=actor,
    )


@router.get(
    "/admin/return-requests/{return_id}",
    response_model=ReturnRequestResponse,
    dependencies=[Depends(require_staff)],
)
async def admin_get_return_request(
    return_id: str,
    service: ReturnService = Depends(_service),
):
    return await service.get_return(return_id, is_staff=True)


@router.post("/admin/return-requests/{return_id}/approve", response_model=ReturnRequestResponse)
async def admin_approve_return(
    return_id: str,
    payload: ReturnApproveRequest = ReturnApproveRequest(),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(require_staff),
    actor: Actor = Depends(resolve_actor),
):
    return await service.approve(return_id, payload, str(current_user.id), actor=actor)


@router.post("/admin/return-requests/{return_id}/reject", response_model=ReturnRequestResponse)
async def admin_reject_return(
    return_id: str,
    payload: ReturnRejectRequest,
    service: ReturnService = Depends(_service),
    current_user: User = Depends(require_staff),
    actor: Actor = Depends(resolve_actor),
):
    return await service.reject(return_id, payload, str(current_user.id), actor=actor)


@router.post(
    "/admin/return-requests/{return_id}/schedule-pickup",
    response_model=ReturnRequestResponse,
)
async def admin_schedule_pickup(
    return_id: str,
    payload: ReturnSchedulePickupRequest = ReturnSchedulePickupRequest(),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(require_staff),
    actor: Actor = Depends(resolve_actor),
):
    return await service.schedule_pickup(return_id, payload, str(current_user.id), actor=actor)


@router.post(
    "/admin/return-requests/{return_id}/mark-received",
    response_model=ReturnRequestResponse,
)
async def admin_mark_received(
    return_id: str,
    payload: ReturnMarkReceivedRequest = ReturnMarkReceivedRequest(),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(require_staff),
    actor: Actor = Depends(resolve_actor),
):
    return await service.mark_received(return_id, payload, str(current_user.id), actor=actor)


@router.post("/admin/return-requests/{return_id}/refund", response_model=ReturnRequestResponse)
async def admin_refund_return(
    return_id: str,
    payload: ReturnRefundRequest = ReturnRefundRequest(),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(require_staff),
    actor: Actor = Depends(resolve_actor),
):
    return await service.issue_refund(return_id, payload, str(current_user.id), actor=actor)


@router.post("/admin/return-requests/{return_id}/close", response_model=ReturnRequestResponse)
async def admin_close_return(
    return_id: str,
    payload: ReturnCloseRequest = ReturnCloseRequest(),
    service: ReturnService = Depends(_service),
    current_user: User = Depends(require_staff),
    actor: Actor = Depends(resolve_actor),
):
    return await service.close(
        return_id,
        payload,
        actor_user_id=str(current_user.id),
        is_staff=True,
        actor=actor,
    )
