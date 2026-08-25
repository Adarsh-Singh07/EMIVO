import re

with open("/opt/elektrix/apps/api/modules/storefront/catalog.py", "r") as f:
    c = f.read()

c = c.replace(
    'params["cat"] = category',
    'params["cat"] = category\n            params["cat_tag"] = f\'%"{category}"%\''
)

with open("/opt/elektrix/apps/api/modules/storefront/catalog.py", "w") as f:
    f.write(c)
