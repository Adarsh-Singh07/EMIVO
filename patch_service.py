import re

with open("apps/api/modules/products/service.py", "r") as f:
    content = f.read()

# Remove `options=data.options,`
content = re.sub(r'^\s*options=data\.options,\n', '', content, flags=re.MULTILINE)

# Remove `product.options = data.options` lines
content = re.sub(r'^\s*if "options" in provided:\n\s*product\.options = data\.options\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*if data\.options is not None:\n\s*product\.options = data\.options\n', '', content, flags=re.MULTILINE)

# Clean up redundant lines 134-139 that are already handled by `in provided`
content = re.sub(r'^\s*if data\.featured is not None:\n\s*product\.featured = data\.featured\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*if data\.specs is not None:\n\s*product\.specs = \[s\.model_dump\(\) for s in data\.specs\]\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*if data\.tags is not None:\n\s*product\.tags = data\.tags\n', '', content, flags=re.MULTILINE)

with open("apps/api/modules/products/service.py", "w") as f:
    f.write(content)
