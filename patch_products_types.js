const fs = require('fs');
const file = '/opt/elektrix/storefront/lib/products.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'brand?: string;',
  'brand?: string;\n  return_policy?: string;\n  warranty_info?: string;'
);

fs.writeFileSync(file, content);
