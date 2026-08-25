const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const newInputs = `                    <input className={inputClass} value={slide.cta || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].cta = e.target.value; return n; })} placeholder="Button text" />
                    <input className={inputClass} value={slide.link || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].link = e.target.value; return n; })} placeholder="Button link URL" />
                    <input className={inputClass} type="number" value={slide.price || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].price = Number(e.target.value); return n; })} placeholder="Price (₹)" />
                    <input className={inputClass} type="number" value={slide.mrp || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].mrp = Number(e.target.value); return n; })} placeholder="MRP (₹)" />`;

content = content.replace(/<input className=\{inputClass\} value=\{slide\.cta \|\| ''\} onChange=\{\(e\) => setHeroSlides\(prev => \{ const n = \[\.\.\.prev\]; n\[idx\]\.cta = e\.target\.value; return n; \}\)\} placeholder="Button text" \/>\s*<input className=\{inputClass\} value=\{slide\.link \|\| ''\} onChange=\{\(e\) => setHeroSlides\(prev => \{ const n = \[\.\.\.prev\]; n\[idx\]\.link = e\.target\.value; return n; \}\)\} placeholder="Button link URL" \/>/, newInputs);

fs.writeFileSync(file, content);
