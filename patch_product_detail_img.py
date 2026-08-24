import re

path = "/opt/elektrix/storefront/components/site/ProductDetail.tsx"
with open(path, "r") as f:
    content = f.read()

# Change object-cover to object-contain for the main image
content = content.replace('className="object-cover object-center"', 'className="object-contain object-center"')
# Also for the thumbnails
content = content.replace('className="object-cover"', 'className="object-contain"')

with open(path, "w") as f:
    f.write(content)
