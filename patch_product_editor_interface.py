import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

# Just inject options?: any[]; right after status?: string | null;
content = content.replace(
    'status?: string | null;\n  featured?: boolean;\n  tags?: string[];\n  variants?: Array<{',
    'status?: string | null;\n  featured?: boolean;\n  tags?: string[];\n  options?: any[];\n  variants?: Array<{'
)

with open(path, "w") as f:
    f.write(content)
