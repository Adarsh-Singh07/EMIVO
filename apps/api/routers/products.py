from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/")
async def list_products(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(text("SELECT id, name, description, price, sku FROM products LIMIT 50"))
    rows = result.fetchall()
    return [{"id": str(r.id), "name": r.name, "description": r.description, "price": r.price, "sku": r.sku} for r in rows]

@router.post("/")
async def create_product(payload: dict[str, Any], db: AsyncSession = Depends(get_db_session)):
    name = payload.get("name")
    price = payload.get("price")
    business_id = payload.get("business_id", "dummy-tenant")
    
    if not name or price is None:
        raise HTTPException(status_code=400, detail="Name and price are required")
        
    result = await db.execute(
        text("INSERT INTO products (name, description, price, sku, business_id) VALUES (:name, :desc, :price, :sku, :bid) RETURNING id, name, price"), 
        {"name": name, "desc": payload.get("description", ""), "price": price, "sku": payload.get("sku", ""), "bid": business_id}
    )
    await db.commit()
    r = result.fetchone()
    return {"id": str(r.id), "name": r.name, "price": r.price}

@router.get("/{id}")
async def get_product(id: str, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(text("SELECT id, name, description, price, sku FROM products WHERE id = :id"), {"id": id})
    r = result.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"id": str(r.id), "name": r.name, "description": r.description, "price": r.price, "sku": r.sku}

