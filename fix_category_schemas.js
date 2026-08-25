const fs = require('fs');

// 1. Update models.py
const modelsFile = '/opt/elektrix/apps/api/modules/products/models.py';
let models = fs.readFileSync(modelsFile, 'utf8');
models = models.replace(
  'image_url = Column(String(1000), nullable=True)',
  'image_url = Column(String(1000), nullable=True)\n    icon = Column(String(255), nullable=True)\n    keywords = Column(String(500), nullable=True)'
);
fs.writeFileSync(modelsFile, models);

// 2. Update products/schemas.py
const pSchemasFile = '/opt/elektrix/apps/api/modules/products/schemas.py';
let pSchemas = fs.readFileSync(pSchemasFile, 'utf8');
pSchemas = pSchemas.replace(
  'parent_id: Optional[str] = None',
  'parent_id: Optional[str] = None\n    icon: Optional[str] = None\n    keywords: Optional[str] = None'
);
fs.writeFileSync(pSchemasFile, pSchemas);

// 3. Update storefront/schemas.py
const sSchemasFile = '/opt/elektrix/apps/api/modules/storefront/schemas.py';
let sSchemas = fs.readFileSync(sSchemasFile, 'utf8');
sSchemas = sSchemas.replace(
  'image_url: Optional[str] = None',
  'image_url: Optional[str] = None\n    icon: Optional[str] = None\n    keywords: Optional[str] = None'
);
fs.writeFileSync(sSchemasFile, sSchemas);

