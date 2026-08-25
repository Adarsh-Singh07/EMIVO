const fs = require('fs');
const file = '/opt/elektrix/storefront/lib/products.ts';
let content = fs.readFileSync(file, 'utf8');

const couponsCode = `
export async function getActiveCoupons(): Promise<any[]> {
  try {
    const res = await fetch(\`\${API_BASE}/store/coupons\`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
`;

content += '\n' + couponsCode;
fs.writeFileSync(file, content);
