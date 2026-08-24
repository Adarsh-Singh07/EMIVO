import re

path = "/opt/elektrix/apps/api/modules/products/schemas.py"
with open(path, "r") as f:
    content = f.read()

# Add to ProductVariantUpdate
content = content.replace(
    'price: Optional[int] = Field(default=None, gt=0)',
    'price: Optional[int] = Field(default=None, gt=0)\n    attributes: Optional[dict] = None\n    is_active: Optional[bool] = None\n    id: Optional[str] = None'
)

# And wait, does ProductVariantCreate have id? No, it's create.
with open(path, "w") as f:
    f.write(content)
