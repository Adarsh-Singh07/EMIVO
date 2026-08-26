"use client";
import { useEffect, useState, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Search, GripVertical, ExternalLink, Eye, EyeOff, Home, HomeIcon } from "lucide-react";

interface Catalogue {
  id: string;
  title: string;
  eyebrow: string | null;
  subtitle: string | null;
  category_link: string | null;
  position: number;
  is_active: boolean;
  is_homepage: boolean;
  product_ids: string[];
}

interface ProductResult {
  id: string;
  name: string;
  brand: string;
  price: number;
  img?: string;
  slug?: string;
}

const inputClass = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1";

function inr(p: number) {
  return "₹" + (p / 100).toLocaleString("en-IN");
}

export default function CataloguesPage() {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("FEATURED");
  const [subtitle, setSubtitle] = useState("");
  const [categoryLink, setCategoryLink] = useState("");
  const [position, setPosition] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isHomepage, setIsHomepage] = useState(true);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productMeta, setProductMeta] = useState<Record<string, ProductResult>>({});

  // Product search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Catalogue[]>("/admin/catalogues");
      setCatalogues(data);
    } catch {
      toast.error("Failed to load catalogues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setTitle(""); setEyebrow("FEATURED"); setSubtitle(""); setCategoryLink("");
    setPosition(catalogues.length); setIsActive(true); setIsHomepage(true);
    setProductIds([]); setProductMeta({}); setSearchQ(""); setSearchResults([]);
    setModalOpen(true);
  };

  const openEdit = async (c: Catalogue) => {
    setEditingId(c.id);
    setTitle(c.title); setEyebrow(c.eyebrow || "FEATURED"); setSubtitle(c.subtitle || "");
    setCategoryLink(c.category_link || ""); setPosition(c.position);
    setIsActive(c.is_active); setIsHomepage(c.is_homepage);
    setProductIds(c.product_ids || []); setSearchQ(""); setSearchResults([]);
    // Load product metadata for existing products
    if (c.product_ids && c.product_ids.length > 0) {
      try {
        const results = await apiClient.get<any[]>(`/products?limit=200`);
        const meta: Record<string, ProductResult> = {};
        results.forEach((p: any) => { if (c.product_ids.includes(p.id)) meta[p.id] = { id: p.id, name: p.name, brand: p.brand, price: p.price, img: p.images?.[0]?.url, slug: p.slug }; });
        setProductMeta(meta);
      } catch {}
    } else {
      setProductMeta({});
    }
    setModalOpen(true);
  };

  const searchProducts = async (q: string) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await apiClient.get<any[]>(`/products?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(res.map((p: any) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price, img: p.images?.[0]?.url, slug: p.slug })));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchProducts(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addProduct = (p: ProductResult) => {
    if (productIds.includes(p.id)) { toast.info("Already in catalogue"); return; }
    setProductIds(prev => [...prev, p.id]);
    setProductMeta(prev => ({ ...prev, [p.id]: p }));
    setSearchQ(""); setSearchResults([]);
  };

  const removeProduct = (id: string) => setProductIds(prev => prev.filter(p => p !== id));

  const moveProduct = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= productIds.length) return;
    const arr = [...productIds];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setProductIds(arr);
  };

  const save = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const payload = { title: title.trim(), eyebrow: eyebrow.trim() || "FEATURED", subtitle: subtitle.trim() || null, category_link: categoryLink.trim() || null, position, is_active: isActive, is_homepage: isHomepage, product_ids: productIds };
    try {
      if (editingId) {
        await apiClient.put(`/admin/catalogues/${editingId}`, payload);
        toast.success("Catalogue updated");
      } else {
        await apiClient.post("/admin/catalogues", payload);
        toast.success("Catalogue created");
      }
      setModalOpen(false);
      await load();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const deleteCatalogue = async (id: string) => {
    if (!confirm("Delete this catalogue?")) return;
    setDeleting(id);
    try { await apiClient.delete(`/admin/catalogues/${id}`); toast.success("Deleted"); await load(); }
    catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  };

  const movePosition = async (c: Catalogue, dir: -1 | 1) => {
    try {
      await apiClient.put(`/admin/catalogues/${c.id}`, { position: c.position + dir });
      await load();
    } catch {}
  };

  const toggleActive = async (c: Catalogue) => {
    try {
      await apiClient.put(`/admin/catalogues/${c.id}`, { is_active: !c.is_active });
      await load();
    } catch {}
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Catalogues</h1>
          <p className="text-sm text-neutral-500 mt-1">Create homepage sections like "New Arrivals" or "Trending in Mobiles". Add products manually — they appear as horizontal scroll strips.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-neutral-950 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" /> New Catalogue
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading…</div>
      ) : catalogues.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl">
          <p className="text-neutral-500 mb-3">No catalogues yet.</p>
          <button onClick={openCreate} className="text-amber-600 font-medium text-sm hover:underline">Create your first catalogue →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {catalogues.map((c) => (
            <div key={c.id} className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${c.is_active ? "bg-white border-neutral-200" : "bg-neutral-50 border-dashed border-neutral-300 opacity-70"}`}>
              <div className="flex flex-col gap-1">
                <button onClick={() => movePosition(c, -1)} className="w-6 h-6 rounded hover:bg-neutral-100 grid place-items-center"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => movePosition(c, 1)} className="w-6 h-6 rounded hover:bg-neutral-100 grid place-items-center"><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{c.eyebrow}</span>
                  {c.is_homepage && <span className="text-xs text-neutral-500 flex items-center gap-1"><HomeIcon className="w-3 h-3" /> Homepage</span>}
                </div>
                <p className="font-semibold text-base mt-1">{c.title}</p>
                {c.subtitle && <p className="text-sm text-neutral-500 truncate">{c.subtitle}</p>}
                <p className="text-xs text-neutral-400 mt-1">{c.product_ids.length} product{c.product_ids.length !== 1 ? "s" : ""} · pos {c.position}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(c)} title={c.is_active ? "Deactivate" : "Activate"} className={`w-8 h-8 rounded-lg grid place-items-center transition-colors ${c.is_active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"}`}>
                  {c.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-lg bg-neutral-100 grid place-items-center hover:bg-neutral-200"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => deleteCatalogue(c.id)} disabled={deleting === c.id} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 grid place-items-center hover:bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{editingId ? "Edit Catalogue" : "New Catalogue"}</h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 grid place-items-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Title *</label>
                  <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Arrivals" />
                </div>
                <div>
                  <label className={labelClass}>Eyebrow Label</label>
                  <input className={inputClass} value={eyebrow} onChange={e => setEyebrow(e.target.value)} placeholder="JUST DROPPED" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Subtitle (optional)</label>
                <input className={inputClass} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Latest products just landed" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>"View All" Link (optional)</label>
                  <input className={inputClass} value={categoryLink} onChange={e => setCategoryLink(e.target.value)} placeholder="/shop?category=mobiles" />
                </div>
                <div>
                  <label className={labelClass}>Position (0 = first)</label>
                  <input className={inputClass} type="number" value={position} onChange={e => setPosition(+e.target.value)} />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                  Active (visible)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={isHomepage} onChange={e => setIsHomepage(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                  Show on Homepage
                </label>
              </div>

              {/* Product search */}
              <div>
                <label className={labelClass}>Add Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    className={`${inputClass} pl-9`}
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search by name, brand, SKU, or tag…"
                  />
                </div>
                {searching && <p className="text-xs text-neutral-400 mt-1">Searching…</p>}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-neutral-200 rounded-xl overflow-hidden shadow-lg">
                    {searchResults.map(p => (
                      <button key={p.id} onClick={() => addProduct(p)} disabled={productIds.includes(p.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-left transition-colors border-b last:border-0 disabled:opacity-40">
                        {p.img && <img src={p.img} alt={p.name} className="w-10 h-10 object-contain rounded bg-neutral-100 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-neutral-500">{p.brand} · {inr(p.price)}</p>
                        </div>
                        {productIds.includes(p.id) ? <span className="text-xs text-green-600 font-semibold">Added</span> : <Plus className="w-4 h-4 text-amber-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product list */}
              {productIds.length > 0 && (
                <div>
                  <label className={labelClass}>{productIds.length} Product{productIds.length !== 1 ? "s" : ""} in this Catalogue</label>
                  <div className="space-y-2 mt-1 max-h-60 overflow-y-auto">
                    {productIds.map((pid, idx) => {
                      const p = productMeta[pid];
                      return (
                        <div key={pid} className="flex items-center gap-3 p-2 border border-neutral-100 rounded-lg bg-neutral-50">
                          <GripVertical className="w-4 h-4 text-neutral-300 shrink-0" />
                          {p?.img && <img src={p.img} alt={p?.name || pid} className="w-9 h-9 object-contain rounded bg-white shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p?.name || pid}</p>
                            {p && <p className="text-xs text-neutral-400">{p.brand} · {inr(p.price)}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => moveProduct(idx, -1)} disabled={idx === 0} className="w-6 h-6 rounded hover:bg-neutral-200 grid place-items-center disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                            <button onClick={() => moveProduct(idx, 1)} disabled={idx === productIds.length - 1} className="w-6 h-6 rounded hover:bg-neutral-200 grid place-items-center disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeProduct(pid)} className="w-6 h-6 rounded hover:bg-red-100 text-red-500 grid place-items-center"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-neutral-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : editingId ? "Update Catalogue" : "Create Catalogue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
