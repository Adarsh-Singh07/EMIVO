import secrets
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from core.exceptions import DomainException
from modules.inventory.repository import InventoryRepository
from modules.products.models import Product, ProductVariant, ProductMedia, ProductStatus
from modules.products.repository import ProductRepository
from modules.products.schemas import (
    ProductCreate, ProductUpdate,
    ProductVariantCreate, ProductVariantUpdate, ProductMediaCreate, _slugify,
)


class ProductService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = ProductRepository(session)
        self.inventory = InventoryRepository(session)

    async def _get_current_business_id(self) -> str:
        bus_query = text("SELECT NULLIF(current_setting('app.business_id', true), '')")
        bus_res = await self.session.execute(bus_query)
        current_b_id = bus_res.scalar()
        if not current_b_id:
            raise DomainException("No business context found", code="FORBIDDEN", status_code=403)
        return str(current_b_id)

    async def _unique_slug(self, name: str) -> str:
        base = _slugify(name)
        slug = base
        while True:
            res = await self.session.execute(
                text("SELECT 1 FROM products WHERE slug = :s LIMIT 1"), {"s": slug}
            )
            if res.scalar() is None:
                return slug
            slug = f"{base}-{secrets.token_hex(3)}"

    async def create_product(self, data: ProductCreate) -> Product:
        business_id = await self._get_current_business_id()

        product = Product(
            business_id=business_id,
            name=data.name,
            description=data.description,
            price=data.price,
            sku=data.sku,
            mrp=data.mrp if data.mrp is not None else data.price,
            sale_price=data.sale_price,
            offer_starts_at=data.offer_starts_at,
            offer_ends_at=data.offer_ends_at,
            brand=data.brand,
            status=ProductStatus(data.status) if data.status else ProductStatus.ACTIVE,
            featured=data.featured,
            category_id=data.category_id,
            specs=[s.model_dump() for s in data.specs] if data.specs else None,
            tags=data.tags,
            slug=await self._unique_slug(data.name),
        )

        await self.repository.create(product)

        if data.media:
            for i, m in enumerate(data.media):
                await self.repository.create_media(ProductMedia(
                    product_id=product.id,
                    media_url=m.media_url,
                    position=m.position or i,
                    alt_text=m.alt_text,
                ))

        # Every product gets an inventory row (zero stock unless initial_stock given)
        await self.inventory.ensure_row(product.id, business_id, data.initial_stock or 0)

        await self.session.commit()
        return await self.repository.get_by_id(product.id)

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
        if data.mrp is not None:
            product.mrp = data.mrp
        if data.sale_price is not None:
            product.sale_price = data.sale_price
        if data.offer_starts_at is not None:
            product.offer_starts_at = data.offer_starts_at
        if data.offer_ends_at is not None:
            product.offer_ends_at = data.offer_ends_at
        if data.brand is not None:
            product.brand = data.brand
        if data.status is not None:
            product.status = ProductStatus(data.status)
        if data.featured is not None:
            product.featured = data.featured
        if data.category_id is not None:
            product.category_id = data.category_id
        if data.specs is not None:
            product.specs = [s.model_dump() for s in data.specs]
        if data.tags is not None:
            product.tags = data.tags

        await self.repository.update(product)
        await self.session.commit()
        return await self.repository.get_by_id(product.id)

    async def delete_product(self, product_id: str) -> None:
        """Soft-delete for commerce: ARCHIVED products disappear from the
        storefront but remain referenced by historical orders."""
        product = await self.get_product(product_id)
        product.status = ProductStatus.ARCHIVED
        await self.repository.update(product)
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

    async def update_variant(self, variant_id: str, data: ProductVariantUpdate) -> ProductVariant:
        from sqlalchemy import select
        res = await self.session.execute(select(ProductVariant).where(ProductVariant.id == variant_id))
        variant = res.scalar_one_or_none()
        if not variant:
            raise DomainException("Variant not found", code="NOT_FOUND", status_code=404)
        if data.name is not None:
            variant.name = data.name
        if data.sku is not None:
            variant.sku = data.sku
        if data.price is not None:
            variant.price = data.price
        await self.session.commit()
        await self.session.refresh(variant)
        return variant

    async def delete_variant(self, variant_id: str) -> None:
        from sqlalchemy import select
        res = await self.session.execute(select(ProductVariant).where(ProductVariant.id == variant_id))
        variant = res.scalar_one_or_none()
        if not variant:
            raise DomainException("Variant not found", code="NOT_FOUND", status_code=404)
        await self.session.delete(variant)
        await self.session.commit()

    async def add_media(self, product_id: str, data: ProductMediaCreate) -> ProductMedia:
        product = await self.get_product(product_id)
        res = await self.session.execute(
            text("SELECT COALESCE(MAX(position), -1) + 1 FROM product_media WHERE product_id = :pid"),
            {"pid": product.id},
        )
        next_pos = res.scalar()
        media = ProductMedia(
            product_id=product.id,
            media_url=data.media_url,
            position=data.position if data.position else next_pos,
            alt_text=data.alt_text,
        )
        await self.repository.create_media(media)
        await self.session.commit()
        return media

    async def delete_media(self, media_id: str) -> None:
        from sqlalchemy import select
        res = await self.session.execute(select(ProductMedia).where(ProductMedia.id == media_id))
        media = res.scalar_one_or_none()
        if not media:
            raise DomainException("Media not found", code="NOT_FOUND", status_code=404)
        await self.session.delete(media)
        await self.session.commit()

    async def reorder_media(self, product_id: str, media_ids: List[str]) -> Product:
        for pos, mid in enumerate(media_ids):
            await self.session.execute(
                text("UPDATE product_media SET position = :pos WHERE id = :mid AND product_id = :pid"),
                {"pos": pos, "mid": mid, "pid": product_id},
            )
        await self.session.commit()
        return await self.repository.get_by_id(product_id)

    async def create_category(self, data) -> "Category":
        from modules.products.models import Category
        business_id = await self._get_current_business_id()
        category = Category(
            business_id=business_id,
            name=data.name,
            slug=_slugify(data.name),
            parent_id=data.parent_id,
            position=data.position,
        )
        self.session.add(category)
        await self.session.commit()
        await self.session.refresh(category)
        return category
