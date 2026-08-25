const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add to props
content = content.replace(
  'brand?: string | null;',
  'brand?: string | null;\n  return_policy?: string | null;\n  warranty_info?: string | null;'
);

// Add state
content = content.replace(
  'const [brand, setBrand] = useState("");',
  'const [brand, setBrand] = useState("");\n  const [returnPolicy, setReturnPolicy] = useState("");\n  const [warrantyInfo, setWarrantyInfo] = useState("");'
);

// Populate state
content = content.replace(
  'setBrand(p.brand || "");',
  'setBrand(p.brand || "");\n      setReturnPolicy(p.return_policy || "");\n      setWarrantyInfo(p.warranty_info || "");'
);

// Build payload
content = content.replace(
  'if (brand.trim()) payload.brand = brand.trim();',
  'if (brand.trim()) payload.brand = brand.trim();\n    if (returnPolicy.trim()) payload.return_policy = returnPolicy.trim();\n    if (warrantyInfo.trim()) payload.warranty_info = warrantyInfo.trim();'
);

// Add UI inputs
const newInputs = `              <div>
                <label className={labelClass}>Brand</label>
                <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Havells" />
              </div>
              <div>
                <label className={labelClass}>Return Policy</label>
                <input className={inputClass} value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} placeholder="e.g. 7-day easy returns" />
              </div>
              <div>
                <label className={labelClass}>Warranty Info</label>
                <input className={inputClass} value={warrantyInfo} onChange={(e) => setWarrantyInfo(e.target.value)} placeholder="e.g. 1-year brand warranty" />
              </div>`;

content = content.replace(
  '              <div>\n                <label className={labelClass}>Brand</label>\n                <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Havells" />\n              </div>',
  newInputs
);

fs.writeFileSync(file, content);
