from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List

from modules.products.models import Product, ProductVariant, ProductMedia, Category

class ProductRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, product: Product) -> Product:
        self.session.add(product)
        await self.session.flush()
        return product

    async def get_by_id(self, product_id: str) -> Optional[Product]:
        stmt = select(Product).options(
            selectinload(Product.variants),
            selectinload(Product.media)
        ).where(Product.id == str(product_id))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_products(self, offset: int = 0, limit: int = 50, search: str | None = None) -> List[Product]:
        stmt = select(Product).options(
            selectinload(Product.variants),
            selectinload(Product.media)
        ).order_by(Product.created_at.desc())
        if search:
            term = f"%{search}%"
            stmt = stmt.where(
                (Product.name.ilike(term)) |
                (Product.brand.ilike(term)) |
                (Product.sku.ilike(term))
            )
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, product: Product) -> Product:
        self.session.add(product)
        await self.session.flush()
        return product

    async def delete(self, product: Product) -> None:
        await self.session.delete(product)
        await self.session.flush()

    async def create_variant(self, variant: ProductVariant) -> ProductVariant:
        self.session.add(variant)
        await self.session.flush()
        return variant
        
    async def create_media(self, media: ProductMedia) -> ProductMedia:
        self.session.add(media)
        await self.session.flush()
        return media
