import re

path = "/opt/elektrix/storefront/components/site/ProductCard.tsx"
with open(path, "r") as f:
    content = f.read()

# Change object-cover to object-contain
content = content.replace('className="object-cover transition-transform duration-300 group-hover:scale-105"', 'className="object-contain transition-transform duration-300 group-hover:scale-105"')

with open(path, "w") as f:
    f.write(content)
