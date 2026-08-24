import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

content = content.replace(
    'const [variants, setVariants] = useState<VariantRowState[]>([]);',
    'const [variants, setVariants] = useState<any[]>([]);\n  const [options, setOptions] = useState<Array<{ name: string; values: string[] }>>([]);'
)

with open(path, "w") as f:
    f.write(content)
