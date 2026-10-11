"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, Image as ImageIcon, Search, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { uploadMediaFile } from "@/lib/media";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface ProductResult {
  id: string;
  name: string;
  brand: string;
  price: number;
  img?: string;
}

interface PriceBucket {
  label: string;
  min_price: number | null;
  max_price: number | null;
}

interface CategoryPage {
  hero_title?: string;
  hero_subtitle?: string;
  hero_image?: string;
  hero_link?: string;
  brand_section_title?: string;
  price_section_title?: string;
  price_buckets?: PriceBucket[];
  featured_product_ids?: string[];
  seo_title?: string;
  seo_description?: string;
}

const inputClass =
  "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

function flattenCats(nodes: Category[]): Category[] {
  const out: Category[] = [];
  for (const n of nodes || []) {
    out.push(n);
    if (n.children?.length) out.push(...flattenCats(n.children));
  }
  return out;
}

function emptyPage(): CategoryPage {
  return {
    hero_title: "",
    hero_subtitle: "",
    hero_image: "",
    hero_link: "",
    brand_section_title: "",
    price_section_title: "",
    price_buckets: [],
    featured_product_ids: [],
    seo_title: "",
    seo_description: "",
  };
}

export default function CategoryPagesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selCat, setSelCat] = useState("");
  const [page, setPage] = useState<CategoryPage>(emptyPage());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // product picker
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [productMeta, setProductMeta] = useState<Record<string, ProductResult>>({});

  const allPages = useCallback(async (): Promise<Record<string, CategoryPage>> => {
    try {
      const s = await apiClient.get<any>("/admin/store-settings");
      return s?.category_pages || {};
    } catch {
      return {};
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, pages] = await Promise.all([
        apiClient.get<Category[]>("/store/categories"),
        allPages(),
      ]);
      setCategories(flattenCats(cats || []));
      setPagesCache(pages);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [allPages]);

  const [pagesCache, setPagesCache] = useState<Record<string, CategoryPage>>({});

  useEffect(() => {
    load();
  }, [load]);

  const selCatObj = categories.find((c) => c.id === selCat);
  const selSlug = selCatObj?.slug;

  // When category selection changes, hydrate the editor from cache (or empty).
  useEffect(() => {
    if (!selCatObj) return;
    const existing = pagesCache[selCatObj.slug];
    setPage(existing ? { ...emptyPage(), ...existing } : emptyPage());
  }, [selCat, selCatObj, pagesCache]);

  const update = (patch: Partial<CategoryPage>) => setPage((p) => ({ ...p, ...patch }));

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadMediaFile(file);
      update({ hero_image: url });
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // Product search (for curated featured picks)
  const searchProducts = async (q: string) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.get<any[]>(`/products/?search=${encodeURIComponent(q)}&limit=8`);
      setSearchResults(
        res.map((p: any) => ({ id: p.id, name: p.name, brand: p.brand || "", price: p.price, img: p.images?.[0]?.url }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => searchProducts(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addProduct = (p: ProductResult) => {
    if ((page.featured_product_ids || []).includes(p.id)) return;
    update({ featured_product_ids: [...(page.featured_product_ids || []), p.id] });
    setProductMeta((prev) => ({ ...prev, [p.id]: p }));
    setSearchQ("");
    setSearchResults([]);
  };

  const removeProduct = (id: string) =>
    update({ featured_product_ids: (page.featured_product_ids || []).filter((x) => x !== id) });

  const moveProduct = (idx: number, dir: -1 | 1) => {
    const arr = [...(page.featured_product_ids || [])];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    update({ featured_product_ids: arr });
  };

  // Price bucket editing
  const addBucket = () =>
    update({ price_buckets: [...(page.price_buckets || []), { label: "", min_price: null, max_price: null }] });

  const setBucket = (i: number, patch: Partial<PriceBucket>) => {
    const next = [...(page.price_buckets || [])];
    next[i] = { ...next[i], ...patch };
    update({ price_buckets: next });
  };

  const rmBucket = (i: number) =>
    update({ price_buckets: (page.price_buckets || []).filter((_, idx) => idx !== i) });

  // Save: write back the full category_pages dict (only this slug is changed).
  const save = async () => {
    if (!selCatObj) return;
    setSaving(true);
    try {
      const pages = await allPages();
      const cleaned: CategoryPage = {
        ...page,
        // strip all-empty so the dict stays tidy
      };
      for (const k of Object.keys(cleaned) as (keyof CategoryPage)[]) {
        const v = cleaned[k];
        if (k === "price_buckets") {
          cleaned.price_buckets = (cleaned.price_buckets || []).filter(
            (b) => b.label.trim() || b.min_price != null || b.max_price != null
          );
        } else if (typeof v === "string" && !v.trim()) {
          delete (cleaned as any)[k];
        }
      }
      (cleaned as any).featured_product_ids = cleaned.featured_product_ids || [];
      pages[selCatObj.slug] = cleaned;
      await apiClient.put("/admin/store-settings", { category_pages: pages });
      setPagesCache(pages);
      toast.success(`${selCatObj.name} page saved`);
    } catch {
      toast.error("Failed to save category page");
    } finally {
      setSaving(false);
    }
  };

  const clearPage = async () => {
    if (!selCatObj) return;
    if (!window.confirm(`Reset the "${selCatObj.name}" page to auto-generated defaults?`)) return;
    setSaving(true);
    try {
      const pages = await allPages();
      delete pages[selCatObj.slug];
      await apiClient.put("/admin/store-settings", { category_pages: pages });
      setPagesCache(pages);
      setPage(emptyPage());
      toast.success("Page reset to defaults");
    } catch {
      toast.error("Failed to reset page");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Category Pages</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fine-tune each category's Flipkart-style landing page. Sections are auto-built from live data; anything
          you set here overrides it.
        </p>
      </div>

      {/* Category selector */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className={`${inputClass} w-64`} value={selCat} onChange={(e) => setSelCat(e.target.value)}>
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selCatObj && (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save page
              </button>
              <button
                onClick={clearPage}
                disabled={saving}
                className="h-11 px-4 rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-600 hover:bg-neutral-200"
              >
                Reset to defaults
              </button>
            </>
          )}
        </div>
      </div>

      {selCatObj ? (
        <div className="space-y-5">
          {/* Hero */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-bold text-neutral-900 mb-4">Hero banner</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Title</label>
                <input className={inputClass} value={page.hero_title || ""} onChange={(e) => update({ hero_title: e.target.value })} placeholder="e.g. Mobiles" />
              </div>
              <div>
                <label className={labelClass}>Subtitle</label>
                <input className={inputClass} value={page.hero_subtitle || ""} onChange={(e) => update({ hero_subtitle: e.target.value })} placeholder="Shop the best phones by brand & price" />
              </div>
              <div>
                <label className={labelClass}>Image URL</label>
                <div className="flex gap-2">
                  <input className={inputClass} value={page.hero_image || ""} onChange={(e) => update({ hero_image: e.target.value })} placeholder="https://…" />
                  <label className="shrink-0 flex items-center justify-center h-11 px-4 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-semibold cursor-pointer hover:bg-neutral-200">
                    {uploading ? "…" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </label>
                </div>
                {page.hero_image && (
                  <img src={page.hero_image} alt="" className="mt-2 h-20 w-32 object-contain rounded-lg border border-neutral-200 bg-neutral-50" />
                )}
              </div>
              <div>
                <label className={labelClass}>Link (optional)</label>
                <input className={inputClass} value={page.hero_link || ""} onChange={(e) => update({ hero_link: e.target.value })} placeholder="/shop?category=mobiles" />
              </div>
            </div>
          </section>

          {/* Section titles */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-bold text-neutral-900 mb-4">Section titles</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>"by Brand" heading</label>
                <input className={inputClass} value={page.brand_section_title || ""} onChange={(e) => update({ brand_section_title: e.target.value })} placeholder={"Defaults to " + selCatObj.name + " by Brand"} />
              </div>
              <div>
                <label className={labelClass}>"by Price" heading</label>
                <input className={inputClass} value={page.price_section_title || ""} onChange={(e) => update({ price_section_title: e.target.value })} placeholder={"Defaults to " + selCatObj.name + " by Price"} />
              </div>
            </div>
          </section>

          {/* Price buckets */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Custom price buckets</h2>
                <p className="text-sm text-neutral-500">Leave empty to auto-generate from live product prices. Prices are ₹.</p>
              </div>
              <button onClick={addBucket} className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                <Plus className="h-4 w-4" /> Add bucket
              </button>
            </div>
            <div className="space-y-2">
              {(page.price_buckets || []).map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input className={`${inputClass} w-40`} placeholder="Label (e.g. Under ₹10k)" value={b.label} onChange={(e) => setBucket(i, { label: e.target.value })} />
                  <input className={`${inputClass} w-28`} type="number" placeholder="Min ₹" value={b.min_price ?? ""} onChange={(e) => setBucket(i, { min_price: e.target.value === "" ? null : Math.round((+e.target.value) * 100) })} />
                  <input className={`${inputClass} w-28`} type="number" placeholder="Max ₹" value={b.max_price ?? ""} onChange={(e) => setBucket(i, { max_price: e.target.value === "" ? null : Math.round((+e.target.value) * 100) })} />
                  <button onClick={() => rmBucket(i)} className="p-2 text-neutral-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(page.price_buckets || []).length === 0 && (
                <p className="text-sm text-neutral-400">No custom buckets — auto buckets will be used.</p>
              )}
            </div>
          </section>

          {/* Curated featured */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-bold text-neutral-900 mb-1">Curated featured products</h2>
            <p className="text-sm text-neutral-500 mb-4">Shown in the carousel. Leave empty to show auto-picked featured items.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                className={`${inputClass} pl-9`}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search products…"
              />
            </div>
            {searching && <p className="text-xs text-neutral-400 mt-2">Searching…</p>}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-left"
                  >
                    {p.img ? <img src={p.img} alt="" className="h-8 w-8 rounded object-contain" /> : <div className="h-8 w-8 rounded bg-neutral-100" />}
                    <span className="flex-1 text-sm">{p.name}</span>
                    {p.brand && <span className="text-xs text-neutral-400">{p.brand}</span>}
                    <Plus className="h-4 w-4 text-neutral-400" />
                  </button>
                ))}
              </div>
            )}
            {(page.featured_product_ids || []).length > 0 && (
              <div className="mt-4 space-y-2">
                <label className={labelClass}>Selected ({(page.featured_product_ids || []).length})</label>
                {page.featured_product_ids!.map((id, i) => {
                  const meta = productMeta[id];
                  return (
                    <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50">
                      <span className="flex-1 text-sm">{meta ? `${meta.name}${meta.brand ? ` · ${meta.brand}` : ""}` : id}</span>
                      <button onClick={() => moveProduct(i, -1)} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" disabled={i === 0}>
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => moveProduct(i, 1)} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" disabled={i === page.featured_product_ids!.length - 1}>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeProduct(id)} className="p-1 text-neutral-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SEO */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-bold text-neutral-900 mb-4">SEO</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Meta title</label>
                <input className={inputClass} value={page.seo_title || ""} onChange={(e) => update({ seo_title: e.target.value })} placeholder={`Buy ${selCatObj.name} online at best prices`} />
              </div>
              <div>
                <label className={labelClass}>Meta description</label>
                <input className={inputClass} value={page.seo_description || ""} onChange={(e) => update({ seo_description: e.target.value })} placeholder="…" />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
          {loading ? "Loading…" : "Select a category to start customising its landing page."}
        </div>
      )}
    </div>
  );
}
