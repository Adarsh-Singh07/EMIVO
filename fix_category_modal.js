const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/products/categories/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('position: 0')) {
  content = content.replace(
    'slug: "",',
    'slug: "", position: 0,'
  );
}

content = content.replace(
  'payload.slug = editingCat.slug;',
  'payload.slug = editingCat.slug;\n      payload.position = Number(editingCat.position || 0);'
);

const positionInput = `
                <div>
                  <label className={labelClass}>Position / Priority (0 is first)</label>
                  <input className={inputClass} type="number" value={editingCat.position || 0} onChange={(e) => setEditingCat(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))} />
                </div>
`;

content = content.replace(
  '<div>\n                  <label className={labelClass}>Keywords',
  positionInput + '\n                <div>\n                  <label className={labelClass}>Keywords'
);
content = content.replace(
  '<div className="grid grid-cols-2 gap-4">\n                <div>\n                  <label className={labelClass}>Icon Name',
  '<div className="grid grid-cols-3 gap-4">\n                <div>\n                  <label className={labelClass}>Icon Name'
);


fs.writeFileSync(file, content);
