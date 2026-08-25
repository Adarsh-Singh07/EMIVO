const fs = require('fs');
const file = '/opt/elektrix/db/migrations/versions/20260825_2220_000000000001_add_return_policy_and_warranty.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "op.add_column('products', sa.Column('warranty_info', sa.String(length=255), nullable=True))",
  "op.add_column('products', sa.Column('warranty_info', sa.String(length=255), nullable=True))\n    op.add_column('categories', sa.Column('icon', sa.String(length=255), nullable=True))\n    op.add_column('categories', sa.Column('keywords', sa.String(length=500), nullable=True))"
);

content = content.replace(
  "op.drop_column('products', 'return_policy')",
  "op.drop_column('products', 'return_policy')\n    op.drop_column('categories', 'keywords')\n    op.drop_column('categories', 'icon')"
);

fs.writeFileSync(file, content);
