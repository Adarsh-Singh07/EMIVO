const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Render UI for Hero Slides right above the submit button in store settings form
const uiStr = `
            {/* Hero Slides CRUD */}
            <div className="pt-4 border-t border-neutral-100">
              <h3 className="text-lg font-semibold mb-4">Home Page Sliding Banners</h3>
              {heroSlides.map((slide, idx) => (
                <div key={idx} className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Banner {idx + 1}</span>
                    <button type="button" onClick={() => setHeroSlides(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Delete</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className={inputClass} value={slide.eyebrow || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].eyebrow = e.target.value; return n; })} placeholder="Eyebrow text" />
                    <input className={inputClass} value={slide.title || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].title = e.target.value; return n; })} placeholder="Title text" />
                    <input className={inputClass} value={slide.subtitle || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].subtitle = e.target.value; return n; })} placeholder="Subtitle text" />
                    <input className={inputClass} value={slide.cta || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].cta = e.target.value; return n; })} placeholder="Button text" />
                    <input className={inputClass} value={slide.link || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].link = e.target.value; return n; })} placeholder="Button link URL" />
                    <input className={inputClass} value={slide.img || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].img = e.target.value; return n; })} placeholder="Image URL" />
                    <input className={inputClass} value={slide.bg || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].bg = e.target.value; return n; })} placeholder="Background CSS (e.g. bg-blue-100)" />
                  </div>
                  {slide.img && <img src={slide.img} className="w-full h-32 object-cover rounded-xl mt-2" />}
                </div>
              ))}
              <button type="button" onClick={() => setHeroSlides(prev => [...prev, { id: Date.now() }])} className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                + Add Banner
              </button>
            </div>

            <div className="flex justify-end">`;

content = content.replace(/\{\/\* Hero Slides & Promo Tiles \*\/\}[\s\S]*?<div className="flex justify-end">/, uiStr);
fs.writeFileSync(file, content);
