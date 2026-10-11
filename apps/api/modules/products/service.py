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
            sku=data.sku if data.sku else f"SKU-{__import__('uuid').uuid4().hex[:8].upper()}", 
            mrp=data.mrp if data.mrp is not None else data.price,
            sale_price=data.sale_price,
            offer_name=data.offer_name,
            offer_starts_at=data.offer_starts_at,
            offer_ends_at=data.offer_ends_at,
            brand=data.brand,
            status=ProductStatus(data.status) if data.status else ProductStatus.ACTIVE,
            featured=data.featured,
            category_id=data.category_id,
            return_policy=getattr(data, "return_policy", None),
            warranty_info=getattr(data, "warranty_info", None),
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

        if data.variants and len(data.variants) > 0:
            from modules.products.models import ProductVariant
            for v in data.variants:
                pv = ProductVariant(
                    product_id=product.id,
                    name=v.name,
                    sku=v.sku,
                    price=v.price,
                    attributes=v.attributes,
                    is_active=v.is_active,
                )
                self.session.add(pv)
                await self.session.flush() # get pv.id
                await self.inventory.ensure_row(product.id, business_id, data.initial_stock or 0, variant_id=pv.id)
        else:
            await self.inventory.ensure_row(product.id, business_id, data.initial_stock or 0)

        await self.sync_product_brand_facet(data.brand, data.category_id)
        await self.session.commit()
        return await self.repository.get_by_id(product.id)

    async def list_products(self, limit: int = 50, offset: int = 0, search: str | None = None) -> List[Product]:
        # RLS implicitly filters by current business context
        return await self.repository.list_products(offset=offset, limit=limit, search=search)

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
        # Optional-clearable fields: explicit null in the payload clears them
        provided = data.model_fields_set
        for field in ("mrp", "sale_price", "offer_name", "offer_starts_at", "offer_ends_at",
                      "category_id", "warranty_info", "return_policy", "brand", "featured",
                      "is_flash_sale"):
            if field in provided:
                setattr(product, field, getattr(data, field))
        
        if "status" in provided and data.status is not None:
            product.status = ProductStatus(data.status)
        
        if "specs" in provided:
            product.specs = [s.model_dump() for s in data.specs] if data.specs else []
        if "tags" in provided:
            product.tags = data.tags

        await self.sync_product_brand_facet(product.brand, product.category_id)
        await self.repository.update(product)
        await self.session.commit()
        return await self.repository.get_by_id(product.id)

    async def delete_product(self, product_id: str) -> None:
        from sqlalchemy import select, func
        from modules.orders.models import OrderItem
        
        product = await self.get_product(product_id)
        
        stmt = select(func.count(OrderItem.id)).where(OrderItem.product_id == product.id)
        res = await self.session.execute(stmt)
        order_count = res.scalar()
        
        if order_count == 0:
            await self.session.delete(product)
        else:
            product.status = ProductStatus.ARCHIVED
            await self.repository.update(product)
            
        await self.session.commit()

    async def add_variant(self, product_id: str, data: ProductVariantCreate) -> ProductVariant:
        product = await self.get_product(product_id)
        variant = ProductVariant(
            product_id=product.id,
            name=data.name,
            sku=data.sku if data.sku else f"SKU-{__import__('uuid').uuid4().hex[:8].upper()}", 
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
        # Handle variants update
        if data.variants is not None:
            from modules.products.models import ProductVariant
            from sqlalchemy import select
            
            # Fetch existing variants
            res = await self.session.execute(select(ProductVariant).where(ProductVariant.product_id == product.id))
            existing_variants = {v.id: v for v in res.scalars().all()}
            
            incoming_ids = set()
            for v_data in data.variants:
                if v_data.id and v_data.id in existing_variants:
                    # Update
                    pv = existing_variants[v_data.id]
                    if v_data.name is not None: pv.name = v_data.name
                    if v_data.sku is not None: pv.sku = v_data.sku
                    if v_data.price is not None: pv.price = v_data.price
                    if v_data.attributes is not None: pv.attributes = v_data.attributes
                    if v_data.is_active is not None: pv.is_active = v_data.is_active
                    incoming_ids.add(pv.id)
                else:
                    # Create new
                    pv = ProductVariant(
                        product_id=product.id,
                        name=v_data.name,
                        sku=v_data.sku,
                        price=v_data.price,
                        attributes=v_data.attributes,
                        is_active=v_data.is_active if v_data.is_active is not None else True,
                    )
                    self.session.add(pv)
                    await self.session.flush()
                    await self.inventory.ensure_row(product.id, await self._get_current_business_id(), 0, variant_id=pv.id)
                    incoming_ids.add(pv.id)
            
            # Delete removed variants
            for vid, pv in existing_variants.items():
                if vid not in incoming_ids:
                    await self.session.delete(pv)
                    
        await self.session.commit()
        return await self.repository.get_by_id(product_id)

    async def create_category(self, data) -> "Category":
        from modules.products.models import Category
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        category = Category(
            business_id=business_id,
            name=data.name,
            slug=_slugify(data.name),
            parent_id=data.parent_id,
            position=data.position,
            image_url=data.image_url,
        )
        self.session.add(category)
        await self.session.commit()
        # Re-fetch to ensure children are loaded for Pydantic
        await self.session.refresh(category)
        return category

    async def update_category(self, category_id: str, data) -> "Category":
        from modules.products.models import Category
        from sqlalchemy import select
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        result = await self.session.execute(
            select(Category).where(Category.id == category_id, Category.business_id == business_id)
        )
        category = result.scalar_one_or_none()
        if not category:
            raise DomainException("Category not found", code="NOT_FOUND", status_code=404)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(category, key, value)
            
        await self.session.commit()
        # Re-fetch to ensure children are loaded for Pydantic
        await self.session.refresh(category)
        return category

    async def delete_category(self, category_id: str) -> None:
        from modules.products.models import Category
        from sqlalchemy import select
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        result = await self.session.execute(
            select(Category).where(Category.id == category_id, Category.business_id == business_id)
        )
        category = result.scalar_one_or_none()
        if not category:
            raise DomainException("Category not found", code="NOT_FOUND", status_code=404)
        
        await self.session.delete(category)
        await self.session.commit()

    # ------------------------------------------------------------------
    # Brands facet (canonical list + per-category associations)
    # ------------------------------------------------------------------

    async def _brand_slug(self, name: str) -> str:
        import re
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:120]
        return slug or "brand"

    async def _get_or_create_brand(self, business_id: str, name: str) -> "Brand":
        from modules.products.models import Brand
        from sqlalchemy import select
        result = await self.session.execute(
            select(Brand).where(Brand.business_id == business_id, Brand.name == name)
        )
        brand = result.scalar_one_or_none()
        if brand:
            return brand
        brand = Brand(business_id=business_id, name=name, slug=await self._brand_slug(name))
        self.session.add(brand)
        await self.session.flush()
        return brand

    async def sync_product_brand_facet(self, brand_name: Optional[str], category_id: Optional[str]) -> None:
        """Keep the brand facet usable with zero admin setup: a product saved
        with a brand auto-registers the brand and associates it with the
        product's category (and that category's parent, so parent landing
        pages like Mobiles accumulate child-category brands)."""
        if not brand_name or not brand_name.strip() or not category_id:
            return
        from modules.products.models import Category, CategoryBrand
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        brand = await self._get_or_create_brand(business_id, brand_name.strip())

        result = await self.session.execute(
            select(Category).where(Category.id == category_id)
        )
        category = result.scalar_one_or_none()
        if not category:
            return
        target_ids = [category.id]
        if category.parent_id:
            target_ids.append(category.parent_id)

        for cid in target_ids:
            existing = await self.session.execute(
                select(CategoryBrand).where(
                    CategoryBrand.category_id == cid, CategoryBrand.brand_id == brand.id
                )
            )
            if not existing.scalar_one_or_none():
                max_pos = await self.session.execute(
                    text("SELECT COALESCE(MAX(position), -1) FROM category_brands WHERE category_id = :c"),
                    {"c": cid},
                )
                self.session.add(CategoryBrand(
                    category_id=cid, brand_id=brand.id, position=(max_pos.scalar() or -1) + 1
                ))
        # no commit here — caller commits with the product write

    async def list_brands(self) -> List[dict]:
        business_id = await self._get_current_business_id()
        res = await self.session.execute(text("""
            SELECT b.id, b.name, b.slug, b.logo_url, b.position,
                   COALESCE(p.product_count, 0) AS product_count,
                   COALESCE(cb.category_ids, ARRAY[]::text[]) AS category_ids
            FROM brands b
            LEFT JOIN (
                SELECT brand, business_id, COUNT(*) AS product_count
                FROM products
                WHERE brand IS NOT NULL AND brand <> ''
                GROUP BY brand, business_id
            ) p ON p.brand = b.name AND p.business_id = b.business_id
            LEFT JOIN (
                SELECT brand_id, ARRAY_AGG(category_id::text ORDER BY position) AS category_ids
                FROM category_brands GROUP BY brand_id
            ) cb ON cb.brand_id = b.id
            WHERE b.business_id = :bid
            ORDER BY b.position, b.name
        """), {"bid": business_id})
        return [dict(r._mapping) for r in res.fetchall()]

    async def create_brand(self, data) -> "Brand":
        from modules.products.models import Brand
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        name = data.name.strip()
        dup = await self.session.execute(
            select(Brand).where(Brand.business_id == business_id, Brand.name == name)
        )
        if dup.scalar_one_or_none():
            raise DomainException("Brand already exists", code="CONFLICT", status_code=409)
        brand = Brand(
            business_id=business_id, name=name,
            slug=await self._brand_slug(name),
            logo_url=data.logo_url, position=data.position,
        )
        self.session.add(brand)
        await self.session.commit()
        return brand

    async def update_brand(self, brand_id: str, data) -> "Brand":
        from modules.products.models import Brand
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        result = await self.session.execute(
            select(Brand).where(Brand.id == brand_id, Brand.business_id == business_id)
        )
        brand = result.scalar_one_or_none()
        if not brand:
            raise DomainException("Brand not found", code="NOT_FOUND", status_code=404)

        updates = data.model_dump(exclude_unset=True)
        old_name = brand.name
        if "name" in updates:
            new_name = (updates.pop("name") or "").strip()
            if new_name and new_name != old_name:
                dup = await self.session.execute(
                    select(Brand).where(
                        Brand.business_id == business_id, Brand.name == new_name, Brand.id != brand_id
                    )
                )
                if dup.scalar_one_or_none():
                    raise DomainException("Brand already exists", code="CONFLICT", status_code=409)
                brand.name = new_name
                brand.slug = await self._brand_slug(new_name)
                # Rename cascades to the denormalized product text
                await self.session.execute(
                    text("UPDATE products SET brand = :new WHERE business_id = :bid AND brand = :old"),
                    {"new": new_name, "bid": business_id, "old": old_name},
                )
        if "logo_url" in updates:
            brand.logo_url = updates.pop("logo_url")
        if "position" in updates:
            brand.position = updates.pop("position")
        await self.session.commit()
        return brand

    async def delete_brand(self, brand_id: str) -> None:
        from modules.products.models import Brand
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        result = await self.session.execute(
            select(Brand).where(Brand.id == brand_id, Brand.business_id == business_id)
        )
        brand = result.scalar_one_or_none()
        if not brand:
            raise DomainException("Brand not found", code="NOT_FOUND", status_code=404)
        usage = await self.session.execute(
            text("SELECT COUNT(*) FROM products WHERE business_id = :bid AND brand = :name"),
            {"bid": business_id, "name": brand.name},
        )
        if (usage.scalar() or 0) > 0:
            raise DomainException(
                "Brand is used by products — reassign them first",
                code="CONFLICT", status_code=409,
            )
        await self.session.delete(brand)
        await self.session.commit()

    async def get_category_brands(self, category_id: str) -> List[dict]:
        await self._get_current_business_id()
        res = await self.session.execute(text("""
            SELECT b.id, b.name, b.slug, b.logo_url, cb.position
            FROM category_brands cb
            JOIN brands b ON b.id = cb.brand_id
            WHERE cb.category_id = :cid
            ORDER BY cb.position, b.name
        """), {"cid": category_id})
        return [dict(r._mapping) for r in res.fetchall()]

    async def set_category_brands(self, category_id: str, brand_ids: List[str]) -> List[dict]:
        from modules.products.models import Category, CategoryBrand
        from sqlalchemy import select
        business_id = await self._get_current_business_id()
        cat = await self.session.execute(
            select(Category).where(Category.id == category_id, Category.business_id == business_id)
        )
        if not cat.scalar_one_or_none():
            raise DomainException("Category not found", code="NOT_FOUND", status_code=404)
        await self.session.execute(
            text("DELETE FROM category_brands WHERE category_id = :cid"), {"cid": category_id}
        )
        for pos, bid in enumerate(brand_ids):
            self.session.add(CategoryBrand(category_id=category_id, brand_id=bid, position=pos))
        await self.session.commit()
        return await self.get_category_brands(category_id)
