const fs = require('fs');
const file = '/opt/elektrix/admin/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const uploadFunction = `
  const [uploadingBannerIdx, setUploadingBannerIdx] = useState<number | null>(null);

  const handleBannerImageUpload = async (idx: number, file: File) => {
    try {
      setUploadingBannerIdx(idx);
      const presign = await apiClient.post<{ upload_url: string; public_url: string }>("/media/presign", {
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      });
      const put = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");
      
      setHeroSlides((prev) => {
        const n = [...prev];
        n[idx].img = presign.public_url;
        return n;
      });
      toast.success("Image uploaded, please save settings to apply");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingBannerIdx(null);
    }
  };
`;

content = content.replace(
  'const reloadAll = () => {',
  uploadFunction + '\n  const reloadAll = () => {'
);

const uploadButton = `
                    <div className="flex gap-2 col-span-2">
                      <input className={inputClass} value={slide.img || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].img = e.target.value; return n; })} placeholder="Image URL" />
                      <label className="shrink-0 flex items-center justify-center h-11 px-4 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-semibold cursor-pointer hover:bg-neutral-200">
                        {uploadingBannerIdx === idx ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleBannerImageUpload(idx, e.target.files[0]);
                          }}
                        />
                      </label>
                    </div>
`;

content = content.replace(
  '<input className={inputClass} value={slide.img || \'\'} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].img = e.target.value; return n; })} placeholder="Image URL" />',
  uploadButton
);

fs.writeFileSync(file, content);
