import re

with open("/opt/elektrix/apps/api/modules/products/service.py", "r") as f:
    content = f.read()

replacement = """        provided = data.model_fields_set
        for field in ("mrp", "sale_price", "offer_starts_at", "offer_ends_at",
                      "category_id", "warranty_info", "return_policy", "brand", "featured"):
            if field in provided:
                setattr(product, field, getattr(data, field))
        
        if "status" in provided and data.status is not None:
            product.status = ProductStatus(data.status)
        
        if "specs" in provided:
            product.specs = [s.model_dump() for s in data.specs] if data.specs else []
        if "tags" in provided:
            product.tags = data.tags
        if "options" in provided:
            product.options = data.options"""

content = re.sub(
    r'provided = data\.model_fields_set.*?product\.status = ProductStatus\(data\.status\)',
    replacement,
    content,
    flags=re.DOTALL
)

with open("/opt/elektrix/apps/api/modules/products/service.py", "w") as f:
    f.write(content)
