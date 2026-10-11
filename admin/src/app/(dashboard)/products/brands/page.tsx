"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2, Award, Link2, GripVertical } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { uploadMediaFile } from "@/lib/media";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  position: number;
  product_count: number;
  category_ids: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface AssociatedBrand {
  id: string;
  name: string;
  position: number;
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

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / inline edit
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Category association panel
  const [selCat, setSelCat] = useState("");
  const [assoc, setAssoc] = useState<AssociatedBrand[]>([]);
  const [assocLoading, setAssocLoading] = useState(false);
  const [savingAssoc, setSavingAssoc] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [b, c] = await Promise.all([
        apiClient.get<Brand[]>("/products/brands"),
        apiClient.get<Category[]>("/store/categories"),
      ]);
      setBrands(b || []);
      setCategories(flattenCats(c || []));
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadAssoc = useCallback(
    async (catId: string) => {
      if (!catId) return;
      setAssocLoading(true);
      try {
        const rows = await apiClient.get<AssociatedBrand[]>(`/products/categories/${catId}/brands`);
        setAssoc((rows || []).sort((a, b) => a.position - b.position));
      } catch {
        setAssoc([]);
      } finally {
        setAssocLoading(false);
      }
    },
    []
  );

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadMediaFile(file);
      setLogo(url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setLogo("");
    setEditingId(null);
  };

  const submitBrand = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      if (editingId) {
        await apiClient.put(`/products/brands/${editingId}`, {
          name: name.trim(),
          logo_url: logo.trim() || null,
        });
        toast.success("Brand updated");
      } else {
        await apiClient.post("/products/brands", { name: name.trim(), logo_url: logo.trim() || null });
        toast.success("Brand created");
      }
      resetForm();
      await load();
      if (selCat) loadAssoc(selCat);
    } catch {
      toast.error("Failed to save brand");
    } finally {
      setAdding(false);
    }
  };

  const deleteBrand = async (b: Brand) => {
    if (b.product_count > 0 && !window.confirm(`"${b.name}" is used by ${b.product_count} product(s). Delete anyway? Products keep their brand text.`))
      return;
    if (b.product_count === 0 && !window.confirm(`Delete "${b.name}"?`)) return;
    try {
      await apiClient.delete(`/products/brands/${b.id}`);
      toast.success("Brand deleted");
      await load();
      if (selCat) loadAssoc(selCat);
    } catch {
      toast.error("Failed to delete brand (it may be in use)");
    }
  };

  const startEdit = (b: Brand) => {
    setEditingId(b.id);
    setName(b.name);
    setLogo(b.logo_url || "");
  };

  // Association operations
  const toggleBrand = (brandId: string, brandName: string) => {
    setAssoc((prev) => {
      if (prev.some((a) => a.id === brandId)) {
        return prev.filter((a) => a.id !== brandId);
      }
      // Look up the brand and append at the end
      const b = brands.find((x) => x.id === brandId);
      if (!b) return prev;
      return [...prev, { id: brandId, name: brandName, position: prev.length }];
    });
  };

  const moveAssoc = (idx: number, dir: -1 | 1) => {
    setAssoc((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const a = next[idx];
      const b = next[j];
      next[idx] = b;
      next[j] = a;
      return next.map((x, i) => ({ ...x, position: i }));
    });
  };

  const saveAssoc = async () => {
    if (!selCat) return;
    setSavingAssoc(true);
    try {
      await apiClient.put(`/products/categories/${selCat}/brands`, {
        brand_ids: assoc.map((a) => a.id),
      });
      toast.success("Category brand list saved");
      loadAssoc(selCat);
    } catch {
      toast.error("Failed to save category brands");
    } finally {
      setSavingAssoc(false);
    }
  };

  const selCatName = categories.find((c) => c.id === selCat)?.name;
  const linkedIds = new Set(assoc.map((a) => a.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Brands</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage the brand facet. Brands auto-register when you add products; manage logos, ordering and the
          per-category "by brand" lists here.
        </p>
      </div>

      {/* Create / edit form */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className={labelClass}>Brand name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Havells" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className={labelClass}>Logo URL</label>
            <input className={inputClass} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
          </div>
          <label className="shrink-0 flex items-center justify-center h-11 px-4 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-semibold cursor-pointer hover:bg-neutral-200">
            {uploading ? "…" : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>
          <button
            onClick={submitBrand}
            disabled={adding || !name.trim()}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-40"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Save" : "Add"}
          </button>
          {editingId && (
            <button onClick={resetForm} className="h-11 px-4 rounded-xl bg-neutral-100 text-sm font-semibold hover:bg-neutral-200">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Brands table */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[560px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-5 py-3.5 font-medium text-neutral-500 w-16">Logo</th>
                <th className="px-5 py-3.5 font-medium text-neutral-500">Brand</th>
                <th className="px-5 py-3.5 font-medium text-neutral-500">Products</th>
                <th className="px-5 py-3.5 font-medium text-neutral-500">Categories</th>
                <th className="px-5 py-3.5 font-medium text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="h-9 w-9 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden flex items-center justify-center">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="h-full w-full object-contain" />
                      ) : (
                        <Award className="h-4 w-4 text-neutral-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-neutral-900">{b.name}</td>
                  <td className="px-5 py-3 text-neutral-500">{b.product_count ?? 0}</td>
                  <td className="px-5 py-3 text-neutral-500">{(b.category_ids || []).length || "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(b)} className="p-2 text-neutral-400 hover:text-blue-600 transition-colors mr-1">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteBrand(b)} className="p-2 text-neutral-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && brands.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-neutral-500">No brands yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-category association editor */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Category brand lists ("by brand")
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">Choose which brands appear on a category's landing page.</p>
          </div>
          <select className={`${inputClass} w-56`} value={selCat} onChange={(e) => { setSelCat(e.target.value); loadAssoc(e.target.value); }}>
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {selCat ? (
          <div className="grid md:grid-cols-2 gap-5">
            {/* available */}
            <div>
              <label className={labelClass}>Available brands</label>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {brands
                  .filter((b) => !linkedIds.has(b.id))
                  .map((b) => (
                    <button
                      key={b.id}
                      onClick={() => toggleBrand(b.id, b.name)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-sm"
                    >
                      <span>{b.name}</span>
                      <Plus className="h-4 w-4 text-neutral-400" />
                    </button>
                  ))}
                {brands.filter((b) => !linkedIds.has(b.id)).length === 0 && (
                  <p className="text-sm text-neutral-400 px-1">All brands added.</p>
                )}
              </div>
            </div>

            {/* selected (ordered) */}
            <div>
              <label className={labelClass}>{selCatName} — shown brands</label>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {assocLoading && <p className="text-sm text-neutral-400">Loading…</p>}
                {assoc.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50">
                    <GripVertical className="h-4 w-4 text-neutral-300" />
                    <span className="flex-1 text-sm">{a.name}</span>
                    <button onClick={() => moveAssoc(i, -1)} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" disabled={i === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => moveAssoc(i, 1)} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" disabled={i === assoc.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleBrand(a.id, a.name)} className="p-1 text-neutral-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {assocLoading === false && assoc.length === 0 && (
                  <p className="text-sm text-neutral-400">No brands selected. Add from the left.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Select a category above to manage its brand list.</p>
        )}

        {selCat && (
          <div className="mt-4">
            <button
              onClick={saveAssoc}
              disabled={savingAssoc}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50"
            >
              {savingAssoc ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save brand list
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
