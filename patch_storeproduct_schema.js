const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/storefront/schemas.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'brand: Optional[str] = None',
  'brand: Optional[str] = None\n    return_policy: Optional[str] = None\n    warranty_info: Optional[str] = None'
);

fs.writeFileSync(file, content);
