import uuid
from typing import Any

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from modules.customers.schemas import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    # Use business_id from RLS context via SET LOCAL, but we still need to set it properly on insert.
    # To keep this simple and matching phase 2/4 boundaries we just set business_id on insert.
    customer_id = uuid.uuid4()
    
    # We must retrieve business_id from the set context since the router doesn't get it directly
    # In a proper setup, business_id comes from token parsed by auth middleware, for now let's query the db for setting
    bus_query = sa.text("SELECT NULLIF(current_setting('app.business_id', true), '')::uuid as business_id")
    bus_res = await session.execute(bus_query)
    current_b_id = bus_res.scalar()
    
    if not current_b_id:
        raise HTTPException(status_code=400, detail="No business context set")
        
    query = sa.text('''
        INSERT INTO customers (id, business_id, name, email, phone, address)
        VALUES (:id, :business_id, :name, :email, :phone, :address)
        RETURNING id, business_id, name, email, phone, address, created_at, updated_at
    ''')
    
    try:
        result = await session.execute(query, {
            "id": customer_id,
            "business_id": current_b_id,
            "name": payload.name,
            "email": payload.email,
            "phone": payload.phone,
            "address": payload.address
        })
        row = result.fetchone()
        await session.commit()
    except sa.exc.IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Customer with this email already exists")
        
    return {
        "id": row.id,
        "business_id": row.business_id,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "address": row.address,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None
    }


@router.get("/", response_model=CustomerListResponse)
async def list_customers(
    page: int = 1,
    page_size: int = 20,
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    offset = (page - 1) * page_size
    
    count_query = sa.text("SELECT COUNT(*) FROM customers")
    count_res = await session.execute(count_query)
    total = count_res.scalar() or 0
    
    query = sa.text('''
        SELECT id, business_id, name, email, phone, address, created_at, updated_at
        FROM customers
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    ''')
    result = await session.execute(query, {"limit": page_size, "offset": offset})
    rows = result.fetchall()
    
    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "business_id": row.business_id,
            "name": row.name,
            "email": row.email,
            "phone": row.phone,
            "address": row.address,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None
        })
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    query = sa.text('''
        SELECT id, business_id, name, email, phone, address, created_at, updated_at
        FROM customers
        WHERE id = :id
    ''')
    result = await session.execute(query, {"id": customer_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return {
        "id": row.id,
        "business_id": row.business_id,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "address": row.address,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None
    }


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    # First check if customer exists
    query = sa.text("SELECT id FROM customers WHERE id = :id")
    result = await session.execute(query, {"id": customer_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    update_fields = []
    params = {"id": customer_id}
    
    if payload.name is not None:
        update_fields.append("name = :name")
        params["name"] = payload.name
    if payload.email is not None:
        update_fields.append("email = :email")
        params["email"] = payload.email
    if payload.phone is not None:
        update_fields.append("phone = :phone")
        params["phone"] = payload.phone
    if payload.address is not None:
        update_fields.append("address = :address")
        params["address"] = payload.address
        
    if not update_fields:
        # Nothing to update, just return the existing customer
        return await get_customer(customer_id, session)
        
    update_fields.append("updated_at = now()")
    
    update_query = sa.text(f'''
        UPDATE customers
        SET {', '.join(update_fields)}
        WHERE id = :id
        RETURNING id, business_id, name, email, phone, address, created_at, updated_at
    ''')
    
    try:
        result = await session.execute(update_query, params)
        row = result.fetchone()
        await session.commit()
    except sa.exc.IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Customer with this email already exists")
        
    return {
        "id": row.id,
        "business_id": row.business_id,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "address": row.address,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None
    }


