import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, require_roles, set_db_context
from core.exceptions import DomainException
from modules.customers.schemas import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from modules.customers.service import CustomerService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])

# Realtime registry: every registered USER is a customer. The legacy
# `customers` table is left-joined by email only for CRM fields
# (address/notes) that accounts can carry.
_USER_SELECT = text('''
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
           u.is_active, u.suspended, u.created_at,
           c.id AS customer_id, c.address, c.notes
    FROM users u
    LEFT JOIN customers c ON lower(c.email) = lower(u.email)
    WHERE u.deleted_at IS NULL
''')

_SEARCH_FILTER = text(''' AND (
        lower(u.email) LIKE :q
        OR lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) LIKE :q
        OR coalesce(u.phone, '') LIKE :q
    )''')


def _row_to_item(row) -> dict:
    return {
        "id": row.id,  # user id — stable key for the detail page
        "customer_id": row.customer_id,
        "business_id": None,
        "name": f"{row.first_name or ''} {row.last_name or ''}".strip() or row.email,
        "email": row.email,
        "phone": row.phone,
        "address": row.address,
        "notes": row.notes,
        "is_active": row.is_active,
        "suspended": row.suspended,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.created_at.isoformat() if row.created_at else None,
    }


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
    """Create a new CRM customer record for the current business."""
    return await service.create_customer(payload)


@router.get("/", response_model=CustomerListResponse)
async def list_customers(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    session: AsyncSession = Depends(set_db_context),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"])),
) -> Any:
    """List every registered account (realtime), with CRM fields joined by email."""
    q = f"%{(search or '').strip().lower()}%"
    params: dict = {"q": q, "limit": page_size, "offset": (page - 1) * page_size}

    count_sql = text(
        "SELECT COUNT(*) FROM users u WHERE u.deleted_at IS NULL"
        + (" AND (lower(u.email) LIKE :q"
           " OR lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) LIKE :q"
           " OR coalesce(u.phone, '') LIKE :q)" if (search or "").strip() else "")
    )
    total = (await session.execute(count_sql, {"q": q} if (search or "").strip() else {})).scalar() or 0

    rows = (
        await session.execute(
            text(
                str(_USER_SELECT)
                + (str(_SEARCH_FILTER) if (search or "").strip() else "")
                + " ORDER BY u.created_at DESC LIMIT :limit OFFSET :offset"
            ),
            params,
        )
    ).fetchall()

    return {
        "items": [_row_to_item(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
        "has_prev": page > 1,
    }


async def _user_row(session: AsyncSession, user_id: str):
    return (
        await session.execute(
            text(str(_USER_SELECT) + " AND u.id = :uid LIMIT 1"), {"uid": user_id}
        )
    ).first()


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    session: AsyncSession = Depends(set_db_context),
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"])),
) -> Any:
    """Get a customer by USER id (falls back to the legacy CRM id)."""
    row = await _user_row(session, customer_id)
    if row is not None:
        return _row_to_item(row)
    return await service.get_customer(customer_id)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    session: AsyncSession = Depends(set_db_context),
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner", "staff"])),
) -> Any:
    """Update a customer's CRM fields.

    Accepts a USER id: the CRM record is resolved by email and upserted, so
    admins can annotate any registered account even if it has no CRM row yet.
    """
    row = await _user_row(session, customer_id)
    if row is None:
        return await service.update_customer(customer_id, payload)

    # Email is the identity key between users and the CRM table — refuse
    # edits that would break the join.
    if payload.email is not None and payload.email.strip().lower() != row.email.lower():
        raise DomainException(
            "Customer email cannot be changed here — it is the account's login identity.",
            code="EMAIL_IMMUTABLE", status_code=422,
        )

    business_id = (
        await session.execute(
            text("SELECT NULLIF(current_setting('app.business_id', true), '')::text")
        )
    ).scalar()
    if not business_id:
        raise DomainException("No business context found.", code="FORBIDDEN", status_code=403)

    name = payload.name if payload.name is not None else (
        f"{row.first_name or ''} {row.last_name or ''}".strip() or row.email
    )
    phone = payload.phone if payload.phone is not None else row.phone
    address = payload.address if payload.address is not None else row.address
    notes = payload.notes if payload.notes is not None else row.notes

    crm_id = (
        await session.execute(
            text("SELECT id FROM customers WHERE lower(email) = lower(:e) LIMIT 1"),
            {"e": row.email},
        )
    ).scalar()

    if crm_id:
        await session.execute(
            text(
                "UPDATE customers SET name = :n, phone = :p, address = :a, notes = :no "
                "WHERE id = :id"
            ),
            {"n": name, "p": phone, "a": address, "no": notes, "id": crm_id},
        )
    else:
        await session.execute(
            text(
                "INSERT INTO customers (id, business_id, name, email, phone, address, notes) "
                "VALUES (:id, :bid, :n, :e, :p, :a, :no)"
            ),
            {
                "id": str(uuid.uuid4()), "bid": business_id, "n": name,
                "e": row.email, "p": phone, "a": address, "no": notes,
            },
        )
    await session.commit()

    updated = await _user_row(session, customer_id)
    return _row_to_item(updated)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    service: CustomerService = Depends(get_customer_service),
    current_user: User = Depends(require_roles(["platform_admin", "owner"])),
) -> None:
    """Soft-delete a legacy CRM record. Registered accounts are managed under /admin/users."""
    await service.delete_customer(customer_id)
