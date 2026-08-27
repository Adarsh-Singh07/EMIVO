import re

with open("apps/api/modules/products/service.py", "r") as f:
    content = f.read()

old_delete = '''    async def delete_product(self, product_id: str) -> None:
        """Soft-delete for commerce: ARCHIVED products disappear from the
        storefront but remain referenced by historical orders."""
        product = await self.get_product(product_id)
        product.status = ProductStatus.ARCHIVED
        await self.repository.update(product)
        await self.session.commit()'''

new_delete = '''    async def delete_product(self, product_id: str) -> None:
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
            
        await self.session.commit()'''

content = content.replace(old_delete, new_delete)

with open("apps/api/modules/products/service.py", "w") as f:
    f.write(content)
