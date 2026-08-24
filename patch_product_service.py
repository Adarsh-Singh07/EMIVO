import re

path = "/opt/elektrix/apps/api/modules/products/service.py"
with open(path, "r") as f:
    content = f.read()

old_create = """        product = Product(
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
        await self.inventory.ensure_row(product.id, business_id, data.initial_stock or 0)"""

new_create = """        product = Product(
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
            options=data.options,
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
            await self.inventory.ensure_row(product.id, business_id, data.initial_stock or 0)"""
content = content.replace(old_create, new_create)

# Same for update
old_update = """        if data.tags is not None:
            product.tags = data.tags"""

new_update = """        if data.tags is not None:
            product.tags = data.tags
        if data.options is not None:
            product.options = data.options"""
content = content.replace(old_update, new_update)

old_update_commit = """        await self.session.commit()
        return await self.repository.get_by_id(product_id)"""

new_update_commit = """        # Handle variants update
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
        return await self.repository.get_by_id(product_id)"""
content = content.replace(old_update_commit, new_update_commit)

with open(path, "w") as f:
    f.write(content)
