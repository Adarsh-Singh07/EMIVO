import re

with open("/opt/elektrix/apps/api/modules/storefront/catalog.py", "r") as f:
    c = f.read()

c = c.replace(
    '"""(c.slug = :cat OR c.id::text = :cat OR c.parent_id IN (\n                    SELECT id FROM categories WHERE slug = :cat))"""',
    '"""(c.slug = :cat OR c.id::text = :cat OR c.parent_id IN (SELECT id FROM categories WHERE slug = :cat) OR (p.tags IS NOT NULL AND p.tags::text ILIKE :cat_tag))"""'
)

with open("/opt/elektrix/apps/api/modules/storefront/catalog.py", "w") as f:
    f.write(c)
