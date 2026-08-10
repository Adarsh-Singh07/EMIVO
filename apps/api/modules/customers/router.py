from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, require_roles, set_db_context
from modules.customers.schemas import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from modules.customers.service import CustomerService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


async def get_customer_service(
    session: AsyncSession = Depends(set_db_context)
) -> CustomerService:
    return CustomerService(session)


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"])),
) -> Any:
    """Create a new customer for the current business."""
    return await service.create_customer(payload)


@router.get("/", response_model=CustomerListResponse)
async def list_customers(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"])),
) -> Any:
    """List customers for the current business with optional search and pagination."""
    items, total = await service.list_customers(page=page, page_size=page_size, search=search)
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
        "has_prev": page > 1,
    }


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"])),
) -> Any:
    """Get a single customer by ID."""
    return await service.get_customer(customer_id)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"])),
) -> Any:
    """Update a customer's details."""
    return await service.update_customer(customer_id, payload)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner"])),
) -> None:
    """Soft-delete a customer. The customer will no longer appear in listings."""
    await service.delete_customer(customer_id)
