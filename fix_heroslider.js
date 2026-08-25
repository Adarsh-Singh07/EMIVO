const fs = require('fs');
const file = '/opt/elektrix/storefront/components/site/HeroSlider.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '{/* Horizontal background image */}',
  '<Link href={s.link || "/shop"} className="absolute inset-0 z-0 block">'
);
content = content.replace(
  '<div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/20" />',
  '<div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/20" />\n        </Link>'
);
content = content.replace(
  'className="relative max-w-[1400px]',
  'className="relative z-10 max-w-[1400px] pointer-events-none'
);
content = content.replace(
  'className="max-w-xl text-white"',
  'className="max-w-xl text-white pointer-events-auto"'
);

fs.writeFileSync(file, content);
