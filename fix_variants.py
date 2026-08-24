import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

content = content.replace('import { VariantBuilder } from "@/components/products/VariantBuilder";\n', "")

with open(path, "w") as f:
    f.write(content)
