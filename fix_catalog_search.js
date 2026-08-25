const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/storefront/catalog.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '(p.name ILIKE :q_{i} OR p.brand ILIKE :q_{i} OR p.sku ILIKE :q_{i} OR p.description ILIKE :q_{i} OR c.name ILIKE :q_{i})',
  '(p.name ILIKE :q_{i} OR p.brand ILIKE :q_{i} OR p.sku ILIKE :q_{i} OR p.description ILIKE :q_{i} OR c.name ILIKE :q_{i} OR c.keywords ILIKE :q_{i})'
);

fs.writeFileSync(file, content);
