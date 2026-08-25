const fs = require('fs');
const file = '/opt/elektrix/storefront/components/site/ProductDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<RotateCcw className="w-5 h-5 text-neutral-400 shrink-0" \/> 7-day easy returns/, '<RotateCcw className="w-5 h-5 text-neutral-400 shrink-0" /> {product.return_policy || "7-day easy returns"}');
content = content.replace(/<ShieldCheck className="w-5 h-5 text-neutral-400 shrink-0" \/> 1-year warranty/, '<ShieldCheck className="w-5 h-5 text-neutral-400 shrink-0" /> {product.warranty_info || "1-year warranty"}');

fs.writeFileSync(file, content);
