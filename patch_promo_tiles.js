const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add state for uploadingPromoIdx
content = content.replace(
  'const [uploadingBannerIdx, setUploadingBannerIdx] = useState<number | null>(null);',
  'const [uploadingBannerIdx, setUploadingBannerIdx] = useState<number | null>(null);\n  const [uploadingPromoIdx, setUploadingPromoIdx] = useState<number | null>(null);'
);

// Add upload handler for promo tiles
const promoUploadHandler = `
  const handlePromoImageUpload = async (idx: number, file: File) => {
    try {
      setUploadingPromoIdx(idx);
      const presign = await apiClient.post<{ upload_url: string; public_url: string }>("/media/presign", {
        filename: file.name,
        content_type: file.type,
      });
      await fetch(presign.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      setPromoTiles(prev => {
        const n = [...prev];
        n[idx].img = presign.public_url;
        return n;
      });
      toast.success("Promo image uploaded");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingPromoIdx(null);
    }
  };
`;
content = content.replace(
  /const handleBannerImageUpload = async/,
  promoUploadHandler + '\n  const handleBannerImageUpload = async'
);

const promoUI = `
            {/* Promo Tiles CRUD */}
            <div className="pt-4 border-t border-neutral-100 mt-8">
              <h3 className="text-lg font-semibold mb-4">Promo Tiles (Shop by Category)</h3>
              <p className="text-sm text-neutral-500 mb-4">Add, delete, or rearrange promotional category tiles.</p>
              {promoTiles.map((slide, idx) => (
                <div key={idx} className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Tile {idx + 1}</span>
                    <div className="flex gap-4">
                      {idx > 0 && <button type="button" onClick={() => setPromoTiles(prev => { const n = [...prev]; const temp = n[idx]; n[idx] = n[idx-1]; n[idx-1] = temp; return n; })} className="text-blue-500 text-sm">Move Up</button>}
                      {idx < promoTiles.length - 1 && <button type="button" onClick={() => setPromoTiles(prev => { const n = [...prev]; const temp = n[idx]; n[idx] = n[idx+1]; n[idx+1] = temp; return n; })} className="text-blue-500 text-sm">Move Down</button>}
                      <button type="button" onClick={() => setPromoTiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Delete</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className={inputClass} value={slide.title || ''} onChange={(e) => setPromoTiles(prev => { const n = [...prev]; n[idx].title = e.target.value; return n; })} placeholder="Title (e.g. Laptops)" />
                    <input className={inputClass} value={slide.subtitle || ''} onChange={(e) => setPromoTiles(prev => { const n = [...prev]; n[idx].subtitle = e.target.value; return n; })} placeholder="Subtitle (e.g. Up to 40% off)" />
                    <input className={inputClass} value={slide.link || ''} onChange={(e) => setPromoTiles(prev => { const n = [...prev]; n[idx].link = e.target.value; return n; })} placeholder="Link URL" />
                    
                    <div className="flex gap-2">
                      <input className={inputClass} value={slide.img || ''} onChange={(e) => setPromoTiles(prev => { const n = [...prev]; n[idx].img = e.target.value; return n; })} placeholder="Image URL" />
                      <label className="shrink-0 flex items-center justify-center h-11 px-4 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-semibold cursor-pointer hover:bg-neutral-200">
                        {uploadingPromoIdx === idx ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handlePromoImageUpload(idx, e.target.files[0]);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {slide.img && <img src={slide.img} className="w-full h-32 object-contain rounded-xl mt-2 bg-neutral-200" />}
                </div>
              ))}
              <button type="button" onClick={() => setPromoTiles(prev => [...prev, { id: Date.now() }])} className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                + Add Tile
              </button>
            </div>
`;
content = content.replace(
  /<h3 className="text-sm font-bold text-neutral-900">Financial Configuration<\/h3>/,
  promoUI + '\n              <h3 className="text-sm font-bold text-neutral-900">Financial Configuration</h3>'
);

fs.writeFileSync(file, content);
