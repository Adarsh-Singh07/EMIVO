const fs = require('fs');
const file = '/opt/elektrix/storefront/lib/products.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/image_url\?: string;/, 'image_url?: string;\n  icon?: string;\n  keywords?: string;');

fs.writeFileSync(file, content);
