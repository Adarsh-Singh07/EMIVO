const fs = require('fs');
const file = '/opt/elektrix/storefront/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[categories, newArrivals, trending, config, coupons\] = await Promise\.all\(\[\n    getActiveCoupons\(\),\n    getCategories\(\),\n    getNewArrivals\(8\),\n    getTrending\(4\),\n    fetchStoreConfigServer\(\),\n  \]\);/g,
  `const [categories, newArrivals, trending, config, coupons] = await Promise.all([
    getCategories(),
    getNewArrivals(8),
    getTrending(4),
    fetchStoreConfigServer(),
    getActiveCoupons(),
  ]);`
);

fs.writeFileSync(file, content);
