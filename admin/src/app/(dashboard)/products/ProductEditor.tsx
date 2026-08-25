"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  LinkIcon,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { VariantBuilder } from "@/components/products/VariantBuilder";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR, rupeesToPaise, paiseToRupeeInput, isoToLocalInput, localInputToIso } from "@/lib/money";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export interface ProductMedia {
  id: string;
  media_url: string;
  position: number;
  alt_text?: string | null;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  attributes?: Record<string, string>;
  is_active?: boolean;
}

export interface ProductFull {
  id: string;
  name: string;
  slug?: string | null;
  sku?: string | null;
  brand?: string | null;
  return_policy?: string | null;
  warranty_info?: string | null;
  description?: string | null;
  category_id?: string | null;
  price: number;
  attributes?: Record<string, string>;
  is_active?: boolean;
  mrp?: number | null;
  sale_price?: number | null;
  offer_starts_at?: string | null;
  offer_ends_at?: string | null;
  status?: string | null;
  featured?: boolean;
  specs?: Array<{ name: string; value: string }> | null;
  tags?: string[] | null;
  options?: any[] | null;
  media?: ProductMedia[] | null;
  variants?: ProductVariant[] | null;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

interface SpecRowState {
  key: string;
  name: string;
  value: string;
}

interface VariantRowState {
  key: string;
  id?: string; // present for existing variants (edit mode)
  name: string;
  sku: string;
  price: string; // rupees
  _deleted?: boolean;
}

interface DraftMedia {
  key: string;
  media_url: string;
}

function flattenCategories(nodes: CategoryNode[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  const out: Array<{ id: string; name: string; depth: number }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name, depth });
    if (n.children?.length) out.push(...flattenCategories(n.children, depth + 1));
  }
  return out;
}

const inputClass =
  "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

export function ProductEditor({ productId }: { productId?: string }) {
  const isEdit = !!productId;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Array<{ id: string; name: string; depth: number }>>([]);

  // Form state
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState(""); // rupees
  const [mrp, setMrp] = useState(""); // rupees
  const [salePrice, setSalePrice] = useState(""); // rupees
  const [offerStarts, setOfferStarts] = useState("");
  const [offerEnds, setOfferEnds] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [featured, setFeatured] = useState(false);
  const [initialStock, setInitialStock] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [specs, setSpecs] = useState<SpecRowState[]>([]);

  // Media (edit mode -> server rows; create mode -> draft list)
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [draftMedia, setDraftMedia] = useState<DraftMedia[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  // Variants
  const [variants, setVariants] = useState<any[]>([]);
  const [options, setOptions] = useState<Array<{ name: string; values: string[] }>>([]);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const [p, cats] = await Promise.all([
        apiClient.get<ProductFull>(`/products/${productId}`),
        apiClient.get<CategoryNode[]>("/store/categories").catch(() => [] as CategoryNode[]),
      ]);
      setCategories(flattenCategories(cats));
      setName(p.name || "");
      setBrand(p.brand || "");
      setReturnPolicy(p.return_policy || "");
      setWarrantyInfo(p.warranty_info || "");
      setSku(p.sku || "");
      setDescription(p.description || "");
      setCategoryId(p.category_id || "");
      setPrice(paiseToRupeeInput(p.price));
      setMrp(paiseToRupeeInput(p.mrp));
      setSalePrice(paiseToRupeeInput(p.sale_price));
      setOfferStarts(isoToLocalInput(p.offer_starts_at));
      setOfferEnds(isoToLocalInput(p.offer_ends_at));
      setStatus((p.status || "DRAFT").toUpperCase());
      setFeatured(!!p.featured);
      setTagsText((p.tags || []).join(", "));
      setSpecs((p.specs || []).map((s, i) => ({ key: `orig-${i}`, name: s.name, value: s.value })));
      setOptions(p.options || []);
      setMedia([...(p.media || [])].sort((a, b) => (a.position || 0) - (b.position || 0)));
      setVariants(
        (p.variants || []).map((v) => ({ 
          key: `v-${v.id}`, 
          id: v.id, 
          name: v.name, 
          sku: v.sku || "", 
          price: paiseToRupeeInput(v.price), 
          attributes: v.attributes || {},
          is_active: v.is_active !== false 
        }))
      );
    } catch (err) {
      setLoadError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    } else {
      apiClient
        .get<CategoryNode[]>("/store/categories")
        .then((cats) => setCategories(flattenCategories(cats)))
        .catch(() => setCategories([]));
    }
  }, [isEdit, loadProduct]);

  // ------------------------- media helpers ------------------------- //

  const presignAndUpload = async (file: File): Promise<string> => {
    const presign = await apiClient.post<{ upload_url: string; public_url: string; key: string }>("/media/presign", {
      filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
    });
    const put = await fetch(presign.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error(`File upload failed (status ${put.status})`);
    return presign.public_url;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setFormError(null);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds the 10 MB limit`);
          continue;
        }
        const publicUrl = await presignAndUpload(file);
        if (isEdit && productId) {
          const added = await apiClient.post<ProductMedia>(`/products/${productId}/media`, { media_url: publicUrl });
          setMedia((prev) => [...prev, added]);
        } else {
          setDraftMedia((prev) => [...prev, { key: `d-${Date.now()}-${Math.random()}`, media_url: publicUrl }]);
        }
      }
      toast.success("Image(s) uploaded");
    } catch (err) {
      const message = err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : (err as Error).message;
      setFormError(message);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addMediaByUrl = async () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    try {
      if (isEdit && productId) {
        const added = await apiClient.post<ProductMedia>(`/products/${productId}/media`, { media_url: url });
        setMedia((prev) => [...prev, added]);
      } else {
        setDraftMedia((prev) => [...prev, { key: `d-${Date.now()}-${Math.random()}`, media_url: url }]);
      }
      setMediaUrlInput("");
      toast.success("Image added");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add image");
    }
  };

  const deleteMedia = async (id: string) => {
    try {
      await apiClient.delete(`/products/media/${id}`);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      toast.success("Image removed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove image");
    }
  };

  const moveMedia = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    setMedia(next);
    if (isEdit && productId) {
      try {
        await apiClient.post(`/products/${productId}/media/reorder`, next.map((m) => m.id));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Reorder failed");
        loadProduct();
      }
    }
  };

  const removeDraftMedia = (key: string) => setDraftMedia((prev) => prev.filter((m) => m.key !== key));
  const moveDraftMedia = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftMedia.length) return;
    const next = [...draftMedia];
    [next[index], next[target]] = [next[target], next[index]];
    setDraftMedia(next);
  };

  // ------------------------- save ------------------------- //

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      price: rupeesToPaise(price) ?? 0,
    };
    if (brand.trim()) payload.brand = brand.trim();
    payload.return_policy = returnPolicy.trim() || null;
    payload.warranty_info = warrantyInfo.trim() || null;
    if (sku.trim()) payload.sku = sku.trim();
    payload.description = description.trim() || null;
    payload.status = status;
    payload.featured = featured;

    // Explicit null clears mrp / sale_price / offer_* / category_id
    const mrpPaise = rupeesToPaise(mrp);
    payload.mrp = mrpPaise ?? null;
    const salePaise = rupeesToPaise(salePrice);
    payload.sale_price = salePaise ?? null;
    payload.offer_starts_at = salePaise != null ? localInputToIso(offerStarts) : null;
    payload.offer_ends_at = salePaise != null ? localInputToIso(offerEnds) : null;
    payload.category_id = categoryId || null;

    payload.specs = specs.filter((s) => s.name.trim() && s.value.trim()).map((s) => ({ name: s.name.trim(), value: s.value.trim() }));
    payload.tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return payload;
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Product name is required.";
    const pricePaise = rupeesToPaise(price);
    if (pricePaise == null || pricePaise <= 0) return "A valid selling price (₹) is required.";
    const mrpPaise = rupeesToPaise(mrp);
    if (mrp.trim() !== "" && mrpPaise == null) return "MRP must be a valid amount in ₹.";
    const salePaise = rupeesToPaise(salePrice);
    if (salePrice.trim() !== "" && salePaise == null) return "Sale price must be a valid amount in ₹.";
    if (salePaise != null && salePaise >= pricePaise) return "Sale price must be lower than the selling price.";
    if (offerStarts && offerEnds && new Date(offerStarts) >= new Date(offerEnds)) return "Offer end must be after offer start.";
    return null;
  };

  const handleSave = async () => {
    const validation = validate();
    if (validation) {
      setFormError(validation);
      toast.error(validation);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let savedId = productId;

      if (!isEdit) {
        const payload = buildPayload();
        const stock = parseInt(initialStock, 10);
        if (!Number.isNaN(stock) && stock >= 0) payload.initial_stock = stock;
        if (draftMedia.length) payload.media = draftMedia.map((m, i) => ({ media_url: m.media_url, position: i }));
        const created = await apiClient.post<{ id: string }>("/products/", payload);
        savedId = created.id;
        // create queued variants
        for (const v of variants.filter((row) => row.name.trim())) {
          await apiClient
            .post(`/products/${savedId}/variants`, {
              name: v.name.trim(),
              sku: v.sku.trim() || null,
              price: rupeesToPaise(v.price) ?? undefined,
            })
            .catch(() => toast.error(`Variant "${v.name}" could not be created`));
        }
        toast.success("Product created");
        router.push(`/products/${savedId}`);
        return;
      }

      // Edit mode: PUT product fields
      await apiClient.put(`/products/${savedId}`, buildPayload());

      // Variant diffs
      for (const v of variants) {
        const paise = rupeesToPaise(v.price);
        if (v._deleted) {
          if (v.id) await apiClient.delete(`/products/variants/${v.id}`).catch(() => toast.error(`Variant "${v.name}" could not be deleted`));
          continue;
        }
        if (v.id) {
          await apiClient
            .put(`/products/variants/${v.id}`, {
              name: v.name.trim(),
              sku: v.sku.trim() || null,
              price: paise ?? undefined,
            })
            .catch(() => toast.error(`Variant "${v.name}" could not be saved`));
        } else if (v.name.trim()) {
          await apiClient
            .post(`/products/${savedId}/variants`, {
              name: v.name.trim(),
              sku: v.sku.trim() || null,
              price: paise ?? undefined,
            })
            .catch(() => toast.error(`Variant "${v.name}" could not be created`));
        }
      }

      toast.success("Product saved");
      router.push("/products");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const hint =
          err.status === 409
            ? " (conflict — check that the SKU is not already in use)"
            : err.status === 422
              ? " (validation failed — check the fields above)"
              : "";
        setFormError(`${err.message}${err.code ? ` [${err.code}]` : ""}${hint}`);
        toast.error(`Save failed: ${err.message}`);
      } else {
        setFormError((err as Error).message || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-semibold text-red-700">{loadError}</p>
        <Link href="/products" className="text-sm font-semibold text-red-700 underline">
          Back to products
        </Link>
      </div>
    );
  }

  const effectivePrice = rupeesToPaise(salePrice) ?? rupeesToPaise(price) ?? 0;
  const mrpPaiseVal = rupeesToPaise(mrp);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{isEdit ? "Edit Product" : "New Product"}</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {isEdit ? "Update catalog entry, offers, media and variants." : "Create a new catalog entry."}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>

      {formError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <p>{formError}</p>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* General */}
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-bold text-neutral-900">General Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Product Name *</label>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Havells Blender 750W" />
              </div>
              <div>
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
              </div>
              <div>
                <label className={labelClass}>SKU</label>
                <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. HVL-BLD-750" />
              </div>
              <div className="relative">
                <label className={labelClass}>Category</label>
                <div className="flex gap-2">
                  <select className={`${inputClass} flex-1`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {"   ".repeat(c.depth)}
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt("New Category Name:");
                      if (!name) return;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      apiClient.post<{ id: string }>("/products/categories", { name, slug })
                        .then((res) => {
                          toast.success("Category created");
                          setCategoryId(res.id);
                          return apiClient.get<{id:string; name:string; depth:number}[]>("/store/categories");
                        })
                        .then((cats) => {
                          const flatten = (nodes: any[], depth = 0): any[] =>
                            nodes.reduce((acc, node) => [...acc, { id: node.id, name: node.name, depth }, ...flatten(node.children || [], depth + 1)], []);
                          setCategories(flatten(cats));
                        })
                        .catch(() => toast.error("Failed to create category"));
                    }}
                    className="shrink-0 px-3 py-2 text-sm font-semibold text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200"
                  >
                    + New
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMING_SOON">Coming Soon</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description shown on the storefront..."
                />
              </div>
            </div>
          </section>

          {/* Pricing + offer */}
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-bold text-neutral-900">Pricing (₹)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Selling Price *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                  <input
                    className={`${inputClass} pl-8`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1299"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {formatINR(rupeesToPaise(price) ?? 0)} ({rupeesToPaise(price) ?? 0} paise)
                </p>
              </div>
              <div>
                <label className={labelClass}>MRP (list price)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                  <input
                    className={`${inputClass} pl-8`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    placeholder="optional"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-400">Shown struck-through when higher than the effective price.</p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Festival Offer</h3>
                  <p className="text-xs text-neutral-500">Optional sale price with a display window.</p>
                </div>
                {effectivePrice > 0 && mrpPaiseVal != null && mrpPaiseVal > effectivePrice && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {Math.round(((mrpPaiseVal - effectivePrice) / mrpPaiseVal) * 100)}% off
                  </span>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Sale Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                    <input
                      className={`${inputClass} pl-8`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="optional"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Offer Starts</label>
                  <input className={inputClass} type="datetime-local" value={offerStarts} onChange={(e) => setOfferStarts(e.target.value)} disabled={!salePrice} />
                </div>
                <div>
                  <label className={labelClass}>Offer Ends</label>
                  <input className={inputClass} type="datetime-local" value={offerEnds} onChange={(e) => setOfferEnds(e.target.value)} disabled={!salePrice} />
                </div>
              </div>
              <p className="text-xs text-neutral-500">Clearing the sale price clears the offer window on save (explicit nulls are sent).</p>
            </div>

            {!isEdit && (
              <div className="sm:w-1/2">
                <label className={labelClass}>Initial Stock (units)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  placeholder="optional — only settable at creation"
                />
              </div>
            )}
          </section>

          {/* Specs + tags */}
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Specifications</h2>
                <p className="text-xs text-neutral-500">Repeatable name/value rows shown on the product page.</p>
              </div>
              <button
                type="button"
                onClick={() => setSpecs((prev) => [...prev, { key: `s-${Date.now()}`, name: "", value: "" }])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <Plus className="h-3.5 w-3.5" /> Add Spec
              </button>
            </div>
            {specs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400">No specifications yet.</p>
            ) : (
              <div className="space-y-2">
                {specs.map((row) => (
                  <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className={`${inputClass} h-10 sm:w-1/3`}
                      placeholder="Name (e.g. Power)"
                      value={row.name}
                      onChange={(e) => setSpecs((prev) => prev.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)))}
                    />
                    <input
                      className={`${inputClass} h-10 flex-1`}
                      placeholder="Value (e.g. 750 W)"
                      value={row.value}
                      onChange={(e) => setSpecs((prev) => prev.map((r) => (r.key === row.key ? { ...r, value: e.target.value } : r)))}
                    />
                    <button
                      type="button"
                      onClick={() => setSpecs((prev) => prev.filter((r) => r.key !== row.key))}
                      className="self-center rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className={labelClass}>Tags (Additional Categories)</label>
              <input className={inputClass} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="comma, separated, tags" />
            </div>
          </section>

          {/* Variants Builder */}
          <VariantBuilder
            options={options}
            setOptions={setOptions}
            variants={variants}
            setVariants={setVariants}
            basePrice={price}
            baseSku={sku}
          />
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Featured toggle */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <span className="text-sm font-bold text-neutral-900">Featured</span>
                <p className="mt-0.5 text-xs text-neutral-500">Highlight this product on the storefront.</p>
              </div>
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-5 w-5 accent-amber-500" />
            </label>
          </section>

          {/* Image manager */}
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Images</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {isEdit ? "Uploads go live immediately (presigned PUT → product media)." : "Images are attached when the product is created."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center transition-colors hover:border-amber-400 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-amber-500" /> : <Upload className="h-6 w-6 text-neutral-400" />}
              <span className="text-sm font-semibold text-neutral-700">{uploading ? "Uploading..." : "Upload images"}</span>
              <span className="text-xs text-neutral-400">PNG / JPG / WebP / AVIF / GIF · max 10 MB each</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="…or paste an image URL"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={addMediaByUrl}
                className="rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Add
              </button>
            </div>

            {(media.length > 0 || draftMedia.length > 0) && (
              <ul className="space-y-2">
                {media.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.media_url} alt={m.alt_text || "product image"} className="h-12 w-12 rounded-lg border border-neutral-200 object-contain" />
                    <span className="flex-1 truncate text-xs text-neutral-500">{m.media_url}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveMedia(i, -1)}
                        disabled={i === 0}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-200/60 disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMedia(i, 1)}
                        disabled={i === media.length - 1}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-200/60 disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMedia(m.id)}
                        className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {draftMedia.map((m, i) => (
                  <li key={m.key} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.media_url} alt="pending product image" className="h-12 w-12 rounded-lg border border-neutral-200 object-contain" />
                    <span className="flex-1 truncate text-xs text-neutral-500">{m.media_url}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveDraftMedia(i, -1)}
                        disabled={i === 0}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-200/60 disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDraftMedia(i, 1)}
                        disabled={i === draftMedia.length - 1}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-200/60 disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeDraftMedia(m.key)} className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {media.length === 0 && draftMedia.length === 0 && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 p-4 text-xs text-neutral-400">
                <ImageIcon className="h-4 w-4" /> No images yet
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Footer save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </div>
  );
}
