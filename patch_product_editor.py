import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

old_desc = """              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full h-32 px-4 py-3 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 resize-none"
                placeholder="Product description and details..."
              />"""

# We need to import dynamic from next/dynamic for ReactQuill
# Wait, react-quill doesn't support SSR out of the box, we need dynamic import.
new_import = """import { Camera, ChevronRight, Image as ImageIcon, Loader2, Plus, Trash2, Link as LinkIcon, RefreshCw, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });"""

if "import dynamic" not in content:
    content = content.replace('import { Camera, ChevronRight, Image as ImageIcon, Loader2, Plus, Trash2, Link as LinkIcon, RefreshCw, Eye } from "lucide-react";', new_import)

new_desc = """              <div className="bg-white [&_.ql-container]:min-h-[160px] [&_.ql-container]:text-sm [&_.ql-container]:font-sans [&_.ql-editor]:min-h-[160px] [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-neutral-50 [&_.ql-toolbar]:rounded-t-xl [&_.ql-container]:border-none [&_.ql-container]:bg-neutral-50 [&_.ql-container]:rounded-b-xl [&_.ql-editor]:px-4">
                <ReactQuill
                  theme="snow"
                  value={form.description}
                  onChange={(val) => setForm({ ...form, description: val })}
                  placeholder="Product description and details..."
                />
              </div>"""

content = content.replace(old_desc, new_desc)

with open(path, "w") as f:
    f.write(content)
