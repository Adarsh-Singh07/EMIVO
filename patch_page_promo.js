const fs = require('fs');
const file = '/opt/elektrix/storefront/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'PROMO_TILES.map((tile) => (',
  `(config?.promo_tiles?.length ? config.promo_tiles : PROMO_TILES).map((tile: any) => (`
);

fs.writeFileSync(file, content);
