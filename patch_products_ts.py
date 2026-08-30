import re

with open("storefront/lib/products.ts", "r") as f:
    content = f.read()

target = """tagline: p.description?.split(/[.\\n]/)[0]?.slice(0, 90) || p.name,
    highlights: p.tags || [],"""

replacement = """tagline: p.description ? p.description.replace(/<[^>]*>/g, '').split(/[.\\n]/)[0]?.slice(0, 90) : p.name,
    highlights: [],"""

content = content.replace(target, replacement)
with open("storefront/lib/products.ts", "w") as f:
    f.write(content)
print("Patched products.ts")
