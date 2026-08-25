const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/products/schemas.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'children: Optional[List["CategoryResponse"]] = None',
  '# children intentionally omitted to prevent lazy load crashes'
);

content = content.replace(
  'CategoryResponse.model_rebuild()',
  ''
);

fs.writeFileSync(file, content);
