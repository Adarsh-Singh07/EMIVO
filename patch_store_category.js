const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/storefront/schemas.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'product_count: int = 0',
  'product_count: int = 0\n    image_url: Optional[str] = None'
);

fs.writeFileSync(file, content);
