const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<button type="button" onClick={() => setHeroSlides(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Delete</button>',
  `<div className="flex gap-4">
                      {idx > 0 && <button type="button" onClick={() => setHeroSlides(prev => { const n = [...prev]; const temp = n[idx]; n[idx] = n[idx-1]; n[idx-1] = temp; return n; })} className="text-blue-500 text-sm">Move Up</button>}
                      {idx < heroSlides.length - 1 && <button type="button" onClick={() => setHeroSlides(prev => { const n = [...prev]; const temp = n[idx]; n[idx] = n[idx+1]; n[idx+1] = temp; return n; })} className="text-blue-500 text-sm">Move Down</button>}
                      <button type="button" onClick={() => setHeroSlides(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Delete</button>
                    </div>`
);

fs.writeFileSync(file, content);
