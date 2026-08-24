import re

# 1. Update Product and Category in products/models.py
path = "/opt/elektrix/apps/api/modules/products/models.py"
with open(path, "r") as f:
    content = f.read()

# Add image_url to Category
content = content.replace(
    'slug = Column(String(280), nullable=True)',
    'slug = Column(String(280), nullable=True)\n    image_url = Column(String(1000), nullable=True)'
)

# Add options to Product
content = content.replace(
    'specs = Column(JSON, nullable=True)  # [{name, value}] specification rows',
    'options = Column(JSON, nullable=True) # [{"name": "Color", "values": ["Red", "Black"]}]\n    specs = Column(JSON, nullable=True)  # [{name, value}] specification rows'
)

# Add attributes and is_active to ProductVariant
content = content.replace(
    'sku = Column(String(50), nullable=True)\n    price = Column(Integer, nullable=False)',
    'sku = Column(String(50), nullable=True)\n    price = Column(Integer, nullable=False)\n    attributes = Column(JSON, nullable=True) # {"Color": "Red", "Storage": "128GB"}\n    is_active = Column(Boolean, nullable=False, default=True, server_default="true")'
)

with open(path, "w") as f:
    f.write(content)

# 2. Update Inventory in inventory/models.py
path_inv = "/opt/elektrix/apps/api/modules/inventory/models.py"
with open(path_inv, "r") as f:
    content_inv = f.read()

# Add variant_id to Inventory
content_inv = content_inv.replace(
    'product_id: Mapped[str] = mapped_column(\n        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True\n    )',
    'product_id: Mapped[str] = mapped_column(\n        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True\n    )\n    variant_id: Mapped[Optional[str]] = mapped_column(\n        String(36), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, unique=True\n    )'
)

with open(path_inv, "w") as f:
    f.write(content_inv)

