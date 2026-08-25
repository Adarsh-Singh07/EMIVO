const fs = require('fs');
const code = fs.readFileSync('/opt/elektrix/storefront/app/page.tsx', 'utf8');
console.log(code);
