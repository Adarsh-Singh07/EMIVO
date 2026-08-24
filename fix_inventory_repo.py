import re

path = "/opt/elektrix/apps/api/modules/inventory/repository.py"
with open(path, "r") as f:
    content = f.read()

# Update get_stock
old_get_stock = """    async def get_stock(self, product_id: str):
        res = await self.session.execute(
            text("SELECT * FROM inventory WHERE product_id = :pid"), {"pid": product_id}
        )"""

new_get_stock = """    async def get_stock(self, product_id: str, variant_id: str = None):
        if variant_id:
            res = await self.session.execute(
                text("SELECT * FROM inventory WHERE variant_id = :vid"), {"vid": variant_id}
            )
        else:
            res = await self.session.execute(
                text("SELECT * FROM inventory WHERE product_id = :pid AND variant_id IS NULL"), {"pid": product_id}
            )"""
content = content.replace(old_get_stock, new_get_stock)

# Update ensure_row
old_ensure_row = """    async def ensure_row(self, product_id: str, business_id: str, on_hand: int = 0) -> None:
        await self.session.execute(
            text(\"\"\"
                INSERT INTO inventory (id, product_id, business_id, on_hand, reserved, low_stock_threshold)
                VALUES (gen_random_uuid()::text, :pid, :bid, :oh, 0, 5)
                ON CONFLICT (product_id) DO NOTHING
            \"\"\"),
            {"pid": product_id, "bid": business_id, "oh": on_hand},
        )"""

new_ensure_row = """    async def ensure_row(self, product_id: str, business_id: str, on_hand: int = 0, variant_id: str = None) -> None:
        await self.session.execute(
            text(\"\"\"
                INSERT INTO inventory (id, product_id, variant_id, business_id, on_hand, reserved, low_stock_threshold)
                VALUES (gen_random_uuid()::text, :pid, :vid, :bid, :oh, 0, 5)
                ON CONFLICT (variant_id) DO NOTHING
            \"\"\"),
            {"pid": product_id, "vid": variant_id, "bid": business_id, "oh": on_hand},
        )"""
content = content.replace(old_ensure_row, new_ensure_row)

with open(path, "w") as f:
    f.write(content)
