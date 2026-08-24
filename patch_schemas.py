import re

path = "/opt/elektrix/apps/api/modules/products/schemas.py"
with open(path, "r") as f:
    content = f.read()

# CategoryBase
content = content.replace(
    'slug: Optional[str] = None\n    position: int = 0',
    'slug: Optional[str] = None\n    position: int = 0\n    image_url: Optional[str] = None'
)

# ProductVariantBase
content = content.replace(
    'price: int = Field(..., gt=0, description="Selling price in paise")',
    'price: int = Field(..., gt=0, description="Selling price in paise")\n    attributes: Optional[dict] = None\n    is_active: bool = True'
)

# ProductBase
content = content.replace(
    'tags: Optional[List[str]] = None',
    'tags: Optional[List[str]] = None\n    options: Optional[List[dict]] = None'
)

# Wait, ProductCreate variants
# ProductCreate currently doesn't accept variants, they are created separately?
# No, let's look at ProductCreate and ProductUpdate
content = content.replace(
    'initial_stock: Optional[int] = Field(default=None, ge=0)',
    'initial_stock: Optional[int] = Field(default=None, ge=0)\n    variants: Optional[List[ProductVariantCreate]] = None'
)

content = content.replace(
    'tags: Optional[List[str]] = None\n    options: Optional[List[dict]] = None',
    'tags: Optional[List[str]] = None\n    options: Optional[List[dict]] = None\n    variants: Optional[List[ProductVariantUpdate]] = None'
)

with open(path, "w") as f:
    f.write(content)

