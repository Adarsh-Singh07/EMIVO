import re

path = "/opt/elektrix/apps/api/modules/inventory/models.py"
with open(path, "r") as f:
    content = f.read()

# Replace unique=True with index=True and add variant_id
old_str = """    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True
    )"""

new_str = """    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    variant_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, unique=True
    )"""

content = content.replace(old_str, new_str)
with open(path, "w") as f:
    f.write(content)
