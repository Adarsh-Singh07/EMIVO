from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from core.exceptions import DomainException
from modules.products.models import Product, ProductVariant, ProductMedia
from modules.products.repository import ProductRepository
from modules.products.schemas import (
    ProductCreate, ProductUpdate, 
    ProductVariantCreate, ProductMediaCreate
)

class ProductService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = ProductRepository(session)

    async def _get_current_business_id(self) -> str:
        bus_query = text("SELECT NULLIF(current_setting('app.business_id', true), '')::uuid as business_id")
        bus_res = await self.session.execute(bus_query)
        current_b_id = bus_res.scalar()
        if not current_b_id:
            raise DomainException("No business context found", code="FORBIDDEN", status_code=403)
        return str(current_b_id)

    async def create_product(self, data: ProductCreate) -> Product:
        business_id = await self._get_current_business_id()
        
        product = Product(
            business_id=business_id,
            name=data.name,
            description=data.description,
            price=data.price,
            sku=data.sku
        )
        
        await self.repository.create(product)
        await self.session.commit()
        
        # Re-fetch with selectinload to eagerly load variants and media
        fetched = await self.repository.get_by_id(product.id)
        return fetched

    async def list_products(self, limit: int = 50, offset: int = 0) -> List[Product]:
        # RLS implicitly filters by current business context
        return await self.repository.list_products(offset=offset, limit=limit)

    async def get_product(self, product_id: str) -> Product:
        product = await self.repository.get_by_id(product_id)
        if not product:
            raise DomainException("Product not found", code="NOT_FOUND", status_code=404)
        return product

    async def update_product(self, product_id: str, data: ProductUpdate) -> Product:
        product = await self.get_product(product_id)
        
        if data.name is not None:
            product.name = data.name
        if data.description is not None:
            product.description = data.description
        if data.price is not None:
            product.price = data.price
        if data.sku is not None:
            product.sku = data.sku
            
        await self.repository.update(product)
        await self.session.commit()
        
        # Re-fetch with selectinload for clean serialization
        return await self.repository.get_by_id(product.id)

    async def delete_product(self, product_id: str) -> None:
        product = await self.get_product(product_id)
        await self.repository.delete(product)
        await self.session.commit()

    async def add_variant(self, product_id: str, data: ProductVariantCreate) -> ProductVariant:
        product = await self.get_product(product_id)
        variant = ProductVariant(
            product_id=product.id,
            name=data.name,
            sku=data.sku,
            price=data.price
        )
        await self.repository.create_variant(variant)
        await self.session.commit()
        return variant

    async def add_media(self, product_id: str, data: ProductMediaCreate) -> ProductMedia:
        product = await self.get_product(product_id)
        media = ProductMedia(
            product_id=product.id,
            media_url=data.media_url
        )
        await self.repository.create_media(media)
        await self.session.commit()
        return media
