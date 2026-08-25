const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/storefront/catalog.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'SELECT c.id, c.name, c.slug, c.parent_id,',
  'SELECT c.id, c.name, c.slug, c.parent_id, c.image_url, c.icon, c.keywords,'
);

content = content.replace(
  'parent_id=r["parent_id"], product_count=r["product_count"],',
  'parent_id=r["parent_id"], product_count=r["product_count"], image_url=r.get("image_url"), icon=r.get("icon"), keywords=r.get("keywords"),'
);

fs.writeFileSync(file, content);
