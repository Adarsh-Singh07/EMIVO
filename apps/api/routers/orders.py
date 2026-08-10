from datetime import datetime
from typing import Any
from uuid import UUID

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.tenant import require_tenant_context

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    dependencies=[Depends(require_tenant_context)]
)

class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int

class OrderCreate(BaseModel):
    items: list[OrderItemCreate]

class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: int
    
    model_config = ConfigDict(from_attributes=True)

class OrderResponse(BaseModel):
    id: UUID
    total_amount: int
    status: str
    created_at: datetime
    items: list[OrderItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    """Create a new order calculating total amount from current product prices."""
    import uuid
    
    product_ids = [item.product_id for item in payload.items]
    if not product_ids:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
        
    query = sa.text("""
        SELECT id, price, business_id FROM products WHERE id = ANY(:product_ids)
    """)
    result = await session.execute(query, {"product_ids": product_ids})
    products = {row.id: {"price": row.price, "business": row.business_id} for row in result}
    
    if len(products) != len(product_ids):
        raise HTTPException(status_code=400, detail="One or more products not found")
        
    total_amount = 0
    business_id = None
    order_items_data = []
    
    for item in payload.items:
        prod = products[item.product_id]
        if not business_id:
            business_id = prod["business"]
            
        unit_price = prod["price"]
        item_total = unit_price * item.quantity
        total_amount += item_total
        
        order_items_data.append({
            "id": uuid.uuid4(),
            "product_id": item.product_id,
            "business_id": business_id,
            "quantity": item.quantity,
            "unit_price": unit_price
        })

    order_id = uuid.uuid4()
    
    order_query = sa.text("""
        INSERT INTO orders (id, business_id, total_amount, status)
        VALUES (:id, :business_id, :total_amount, :status)
        RETURNING id, total_amount, status, created_at
    """)
    
    order_res = await session.execute(order_query, {
        "id": order_id,
        "business_id": business_id,
        "total_amount": total_amount,
        "status": "PENDING"
    })
    
    order_row = order_res.fetchone()
    
    items_query = sa.text("""
        INSERT INTO order_items (id, order_id, product_id, business_id, quantity, unit_price)
        VALUES (:id, :order_id, :product_id, :business_id, :quantity, :unit_price)
        RETURNING id, product_id, quantity, unit_price
    """)
    
    items_responses = []
    for item_data in order_items_data:
        item_data["order_id"] = order_id
        item_res = await session.execute(items_query, item_data)
        items_responses.append(item_res.fetchone())
        
    await session.commit()
    
    return {
        "id": order_row.id,
        "total_amount": order_row.total_amount,
        "status": order_row.status,
        "created_at": order_row.created_at,
        "items": items_responses
    }

@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    query = sa.text("SELECT id, total_amount, status, created_at FROM orders ORDER BY created_at DESC")
    result = await session.execute(query)
    
    return [
        {
            "id": row.id, 
            "total_amount": row.total_amount, 
            "status": row.status, 
            "created_at": row.created_at, 
            "items": []
        } 
        for row in result
    ]

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    order_query = sa.text("SELECT id, total_amount, status, created_at FROM orders WHERE id = :order_id")
    order_res = await session.execute(order_query, {"order_id": order_id})
    order_row = order_res.fetchone()
    
    if not order_row:
        raise HTTPException(status_code=404, detail="Order not found")
        
    items_query = sa.text("SELECT id, product_id, quantity, unit_price FROM order_items WHERE order_id = :order_id")
    items_res = await session.execute(items_query, {"order_id": order_id})
    
    return {
        "id": order_row.id,
        "total_amount": order_row.total_amount,
        "status": order_row.status,
        "created_at": order_row.created_at,
        "items": [row for row in items_res]
    }

