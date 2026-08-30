import re

with open("storefront/lib/products.ts", "r") as f:
    content = f.read()

content = content.replace("replace(/<[^>]*>/g, '')", "replace(/<[^>]*>/g, ' ').trim()")
with open("storefront/lib/products.ts", "w") as f:
    f.write(content)
print("Patched products.ts space")
