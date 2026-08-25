const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/products/categories/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update Interface
content = content.replace(
  'image_url?: string;',
  'image_url?: string;\n  icon?: string;\n  keywords?: string;'
);

// Add Update function
const updateFunc = `
  const handleUpdate = async (categoryId: string, field: string, value: string) => {
    try {
      await apiClient.put(\`/products/categories/\${categoryId}\`, { [field]: value });
      toast.success("Updated");
      loadCategories();
    } catch (err) {
      toast.error("Failed to update");
    }
  };
`;
content = content.replace('  const handleImageUpload', updateFunc + '\n  const handleImageUpload');

// Update table headers
content = content.replace(
  '<th className="px-6 py-4 font-medium text-neutral-500">Name</th>\n              <th className="px-6 py-4 font-medium text-neutral-500">Slug</th>',
  '<th className="px-6 py-4 font-medium text-neutral-500">Name</th>\n              <th className="px-6 py-4 font-medium text-neutral-500">Icon</th>\n              <th className="px-6 py-4 font-medium text-neutral-500">Keywords</th>'
);

// Update table rows
content = content.replace(
  '<td className="px-6 py-4 font-medium text-neutral-900">{c.name}</td>\n                <td className="px-6 py-4 text-neutral-500">{c.slug}</td>',
  `<td className="px-6 py-4 font-medium text-neutral-900">{c.name}</td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    defaultValue={c.icon || ""}
                    onBlur={(e) => { if (e.target.value !== c.icon) handleUpdate(c.id, "icon", e.target.value); }}
                    className="w-full text-sm border-neutral-200 rounded-lg px-2 py-1"
                    placeholder="e.g. Smartphone"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    defaultValue={c.keywords || ""}
                    onBlur={(e) => { if (e.target.value !== c.keywords) handleUpdate(c.id, "keywords", e.target.value); }}
                    className="w-full text-sm border-neutral-200 rounded-lg px-2 py-1"
                    placeholder="e.g. mobile, phone"
                  />
                </td>`
);

fs.writeFileSync(file, content);
