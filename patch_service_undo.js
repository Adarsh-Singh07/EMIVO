const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/products/service.py';
let content = fs.readFileSync(file, 'utf8');

// Undo eager loading in update_category
content = content.replace(
  /res = await self\.session\.execute\(\n\s+select\(Category\)\.options\(selectinload\(Category\.children\)\)\.where\(Category\.id == category\.id\)\n\s+\)\n\s+return res\.scalar_one\(\)/g,
  `await self.session.refresh(category)\n        return category`
);

content = content.replace(
  /from sqlalchemy\.orm import selectinload\n\s+/g,
  ''
);

content = content.replace(
  /select\(Category\)\n\s+\.options\(selectinload\(Category\.children\)\)\n\s+\.where\(Category\.id == category_id, Category\.business_id == business_id\)/g,
  `select(Category).where(Category.id == category_id, Category.business_id == business_id)`
);


fs.writeFileSync(file, content);
