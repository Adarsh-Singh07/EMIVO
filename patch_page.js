const fs = require('fs');
const file = '/opt/elektrix/storefront/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'getTrending,',
  `getTrending,
  fetchStoreConfigServer,`
);

content = content.replace(
  'const [categories, newArrivals, trending] = await Promise.all([',
  `const [categories, newArrivals, trending, config] = await Promise.all([`
);

content = content.replace(
  'getTrending(4),',
  `getTrending(4),
    fetchStoreConfigServer(),`
);

content = content.replace(
  '<HeroSlider />',
  `<HeroSlider slides={config?.hero_slides} />`
);

fs.writeFileSync(file, content);
