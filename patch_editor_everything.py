import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. Imports
imports_addition = """import { VariantBuilder } from "@/components/products/VariantBuilder";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
"""

if 'VariantBuilder' not in content:
    content = content.replace('import { toast } from "sonner";', imports_addition + 'import { toast } from "sonner";')

# 2. Description replacing
old_desc = """              <textarea
                className={`${inputClass} h-32 resize-none`}
                placeholder="Detailed description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />"""

new_desc = """              <div className="overflow-hidden rounded-xl bg-neutral-50 ring-1 ring-inset ring-neutral-200 focus-within:ring-2 focus-within:ring-inset focus-within:ring-amber-500 [&_.ql-container]:min-h-[160px] [&_.ql-container]:border-none [&_.ql-container]:font-sans [&_.ql-container]:text-sm [&_.ql-editor]:px-4 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-l-0 [&_.ql-toolbar]:border-r-0 [&_.ql-toolbar]:border-t-0 [&_.ql-toolbar]:border-neutral-200">
                <ReactQuill
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  placeholder="Detailed description..."
                />
              </div>"""
content = content.replace(old_desc, new_desc)

with open(path, "w") as f:
    f.write(content)
