"""Catalogue router — admin CRUD + public storefront endpoint."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_db_session, require_staff, optional_db_context, set_db_context
from core.store import get_store_business_id
from modules.catalogues.models import ProductCatalogue
from modules.catalogues.schemas import CatalogueCreate, CatalogueUpdate, CatalogueResponse

router = APIRouter()
admin_router = APIRouter()


@router.get("/catalogues")
async def public_catalogues(session: AsyncSession = Depends(optional_db_context)):
    """Returns active homepage catalogues with full product data."""
    from modules.storefront.catalog import CatalogService
    store_id = await get_store_business_id(session)

    res = await session.execute(
        text("""
            SELECT id, title, eyebrow, subtitle, category_link, position, product_ids
            FROM product_catalogues
            WHERE business_id = :bid AND is_active = true AND is_homepage = true
            ORDER BY position ASC
        """),
        {"bid": store_id},
    )
    rows = res.mappings().all()

    catalog_svc = CatalogService(session)
    result = []
    for row in rows:
        pids = list(row["product_ids"] or [])
        products = await catalog_svc.get_products_by_ids(pids) if pids else []
        result.append({
            "id": row["id"],
            "title": row["title"],
            "eyebrow": row["eyebrow"],
            "subtitle": row["subtitle"],
            "category_link": row["category_link"],
            "position": row["position"],
            "products": products,
        })
    return result


@admin_router.get("/catalogues", dependencies=[Depends(require_staff)])
async def list_catalogues(session: AsyncSession = Depends(set_db_context)):
    store_id = await get_store_business_id(session)
    res = await session.execute(
        select(ProductCatalogue)
        .where(ProductCatalogue.business_id == store_id)
        .order_by(ProductCatalogue.position)
    )
    items = res.scalars().all()
    return [CatalogueResponse.model_validate(i) for i in items]


@admin_router.post("/catalogues", dependencies=[Depends(require_staff)])
async def create_catalogue(data: CatalogueCreate, session: AsyncSession = Depends(set_db_context)):
    store_id = await get_store_business_id(session)
    cat = ProductCatalogue(business_id=store_id, **data.model_dump())
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return CatalogueResponse.model_validate(cat)


@admin_router.put("/catalogues/{catalogue_id}", dependencies=[Depends(require_staff)])
async def update_catalogue(catalogue_id: str, data: CatalogueUpdate, session: AsyncSession = Depends(set_db_context)):
    store_id = await get_store_business_id(session)
    res = await session.execute(
        select(ProductCatalogue).where(
            ProductCatalogue.id == catalogue_id,
            ProductCatalogue.business_id == store_id,
        )
    )
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Catalogue not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await session.commit()
    await session.refresh(cat)
    return CatalogueResponse.model_validate(cat)


@admin_router.delete("/catalogues/{catalogue_id}", dependencies=[Depends(require_staff)])
async def delete_catalogue(catalogue_id: str, session: AsyncSession = Depends(set_db_context)):
    store_id = await get_store_business_id(session)
    res = await session.execute(
        select(ProductCatalogue).where(
            ProductCatalogue.id == catalogue_id,
            ProductCatalogue.business_id == store_id,
        )
    )
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Catalogue not found")
    await session.delete(cat)
    await session.commit()
    return {"ok": True}
