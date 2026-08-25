const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/products/service.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /await self.session.commit\(\)\n\s+await self.session.refresh\(category\)\n\s+return category/g,
  `await self.session.commit()
        # Re-fetch to ensure children are loaded for Pydantic
        res = await self.session.execute(
            select(Category).options(selectinload(Category.children)).where(Category.id == category.id)
        )
        return res.scalar_one()`
);

fs.writeFileSync(file, content);
