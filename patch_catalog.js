const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/storefront/catalog.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'p.slug, p.description, p.brand, p.sku, p.price, p.mrp,',
  'p.slug, p.description, p.brand, p.return_policy, p.warranty_info, p.sku, p.price, p.mrp,'
);

content = content.replace(
  'brand=d.get("brand"),',
  'brand=d.get("brand"),\n            return_policy=d.get("return_policy"),\n            warranty_info=d.get("warranty_info"),'
);

fs.writeFileSync(file, content);
