const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/products/models.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'specs = Column(JSON, nullable=True)  # [{name, value}] specification rows',
  'return_policy = Column(String(255), nullable=True)\n    warranty_info = Column(String(255), nullable=True)\n    specs = Column(JSON, nullable=True)  # [{name, value}] specification rows'
);

fs.writeFileSync(file, content);
