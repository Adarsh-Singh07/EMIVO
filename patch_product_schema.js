const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/products/schemas.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'specs: Optional[List[SpecRow]] = None',
  'return_policy: Optional[str] = None\n    warranty_info: Optional[str] = None\n    specs: Optional[List[SpecRow]] = None'
);

fs.writeFileSync(file, content);
