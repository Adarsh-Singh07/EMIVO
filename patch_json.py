import re

with open("apps/api/modules/storefront/router.py", "r") as f:
    code = f.read()

new_code = code.replace("return [dict(row._mapping) for row in result.fetchall()]", "return [{**dict(row._mapping), 'discount_type': str(row._mapping['discount_type'].value) if hasattr(row._mapping['discount_type'], 'value') else str(row._mapping['discount_type'])} for row in result.fetchall()]")

with open("apps/api/modules/storefront/router.py", "w") as f:
    f.write(new_code)
