const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'if (returnPolicy.trim()) payload.return_policy = returnPolicy.trim();',
  'payload.return_policy = returnPolicy.trim() || null;'
);

content = content.replace(
  'if (warrantyInfo.trim()) payload.warranty_info = warrantyInfo.trim();',
  'payload.warranty_info = warrantyInfo.trim() || null;'
);

fs.writeFileSync(file, content);
