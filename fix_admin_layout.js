const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const promoTilesCodeMatch = content.match(/\{\/\* Promo Tiles CRUD \*\/\}([\s\S]*?)<\/div>/g);

if (promoTilesCodeMatch) {
  const promoTilesCode = promoTilesCodeMatch[0];
  content = content.replace(promoTilesCode, '');
  
  // Insert it after Hero Slides
  content = content.replace(
    /<\/button>\n\s*<\/div>\n\s*<div className="flex justify-end">/,
    '</button>\n              </div>\n\n              ' + promoTilesCode + '\n\n            <div className="flex justify-end">'
  );
  
  fs.writeFileSync(file, content);
  console.log("Moved Promo Tiles successfully");
} else {
  console.log("Could not find Promo Tiles code");
}
