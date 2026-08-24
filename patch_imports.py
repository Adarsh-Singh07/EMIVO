import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

imports_addition = """import { VariantBuilder } from "@/components/products/VariantBuilder";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
"""

if 'import { VariantBuilder }' not in content:
    content = content.replace('import { toast } from "sonner";', imports_addition + 'import { toast } from "sonner";')

if 'const ReactQuill' not in content:
    content = content.replace('export interface ProductMedia', 'const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });\n\nexport interface ProductMedia')

with open(path, "w") as f:
    f.write(content)
