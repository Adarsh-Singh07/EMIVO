"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Upload,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";

interface BankOffer {
  id: string;
  bank_name: string;
  card_type: "CREDIT" | "DEBIT" | "ALL";
  discount_text: string;
  poster_url: string | null;
  link: string | null;
  starts_at: string | null;
  ends_at: string | null;
  position: number;
  is_active: boolean;
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

const inputCls =
  "w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
const labelCls = "mb-1.5 block text-sm font-semibold text-neutral-700";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

/** datetime-local input value ↔ ISO. The input needs a local "YYYY-MM-DDTHH:mm". */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function BankOffersPage() {
  const [offers, setOffers] = useState<BankOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form fields
  const [bankName, setBankName] = useState("");
  const [cardType, setCardType] = useState<"CREDIT" | "DEBIT" | "ALL">("CREDIT");
  const [discountText, setDiscountText] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [position, setPosition] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productMeta, setProductMeta] = useState<Record<string, ProductResult>>({});

  // Product search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<BankOffer[]>("/admin/bank-offers");
      setOffers(data);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load bank offers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searchProducts = async (q: string) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.get<any[]>(`/products/?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(
        res.map((p: any) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price, img: p.images?.[0]?.url, slug: p.slug }))
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
    if (productIds.includes(p.id)) {
      toast.info("Already added");
      return;
    }
    setProductIds((prev) => [...prev, p.id]);
    setProductMeta((prev) => ({ ...prev, [p.id]: p }));
    setSearchQ("");
    setSearchResults([]);
  };

  const removeProduct = (id: string) => setProductIds((prev) => prev.filter((p) => p !== id));

  const handlePosterUpload = async (file: File) => {
    try {
      setUploading(true);
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
      setPosterUrl(presign.public_url);
      toast.success("Poster uploaded");
    } catch {
      toast.error("Failed to upload poster");
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setBankName("");
    setCardType("CREDIT");
    setDiscountText("");
    setPosterUrl("");
    setLink("");
    setStartsAt("");
    setEndsAt("");
    setPosition(offers.length);
    setIsActive(true);
    setProductIds([]);
    setProductMeta({});
    setSearchQ("");
    setSearchResults([]);
    setModalOpen(true);
  };

  const openEdit = async (o: BankOffer) => {
    setEditId(o.id);
    setBankName(o.bank_name);
    setCardType(o.card_type);
    setDiscountText(o.discount_text);
    setPosterUrl(o.poster_url || "");
    setLink(o.link || "");
    setStartsAt(toLocalInput(o.starts_at));
    setEndsAt(toLocalInput(o.ends_at));
    setPosition(o.position);
    setIsActive(o.is_active);
    setProductIds(o.product_ids || []);
    setSearchQ("");
    setSearchResults([]);
    if (o.product_ids && o.product_ids.length > 0) {
      try {
        const results = await apiClient.get<any[]>(`/products/?limit=200`);
        const meta: Record<string, ProductResult> = {};
        results.forEach((p: any) => {
          if (o.product_ids.includes(p.id))
            meta[p.id] = { id: p.id, name: p.name, brand: p.brand, price: p.price, img: p.images?.[0]?.url, slug: p.slug };
        });
        setProductMeta(meta);
      } catch {}
    } else {
      setProductMeta({});
    }
    setModalOpen(true);
  };

  const save = async () => {
    if (!bankName.trim()) {
      toast.error("Bank name is required");
      return;
    }
    if (!discountText.trim()) {
      toast.error("Discount text is required");
      return;
    }
    setSaving(true);
    const payload = {
      bank_name: bankName.trim(),
      card_type: cardType,
      discount_text: discountText.trim(),
      poster_url: posterUrl.trim() || null,
      link: link.trim() || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      position: position,
      is_active: isActive,
      product_ids: productIds,
    };
    try {
      if (editId) {
        await apiClient.put(`/admin/bank-offers/${editId}`, payload);
        toast.success("Bank offer updated");
      } else {
        await apiClient.post("/admin/bank-offers", payload);
        toast.success("Bank offer created");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (o: BankOffer) => {
    setBusyId(o.id);
    try {
      await apiClient.put(`/admin/bank-offers/${o.id}`, { ...o, is_active: !o.is_active });
      setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, is_active: !x.is_active } : x)));
      toast.success(`Offer ${o.is_active ? "deactivated" : "activated"}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (o: BankOffer) => {
    if (!window.confirm(`Delete the ${o.bank_name} offer? This cannot be undone.`)) return;
    setBusyId(o.id);
    try {
      await apiClient.delete(`/admin/bank-offers/${o.id}`);
      toast.success("Bank offer deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const movePosition = async (o: BankOffer, dir: -1 | 1) => {
    try {
      await apiClient.put(`/admin/bank-offers/${o.id}`, { ...o, position: Math.max(0, o.position + dir) });
      await load();
    } catch {}
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Landmark className="w-7 h-7 text-amber-500" /> Bank Offers
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Card-based promotions like "10% off with HDFC credit cards". Shown on the homepage, product pages and checkout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700"
          >
            <Plus className="w-4 h-4" /> New Offer
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {loading && offers.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <Landmark className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">No bank offers yet</h3>
            <p className="text-sm text-neutral-500">Create one to promote card discounts on the storefront.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div
              key={o.id}
              className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${
                o.is_active ? "bg-white border-neutral-200" : "bg-neutral-50 border-dashed border-neutral-300 opacity-70"
              }`}
            >
              <div className="flex flex-col gap-1">
                <button onClick={() => movePosition(o, -1)} className="w-6 h-6 rounded hover:bg-neutral-100 grid place-items-center">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => movePosition(o, 1)} className="w-6 h-6 rounded hover:bg-neutral-100 grid place-items-center">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              {o.poster_url ? (
                <img src={o.poster_url} alt={o.bank_name} className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-amber-50 border border-amber-200 grid place-items-center shrink-0">
                  <Landmark className="w-6 h-6 text-amber-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base">{o.bank_name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5">
                    {o.card_type === "ALL" ? "Credit & Debit" : o.card_type}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 truncate">{o.discount_text}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {fmtDate(o.starts_at)} → {fmtDate(o.ends_at)} ·{" "}
                  {o.product_ids.length === 0 ? "Sitewide" : `${o.product_ids.length} product${o.product_ids.length !== 1 ? "s" : ""}`} · pos {o.position}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(o)}
                  disabled={busyId === o.id}
                  title={o.is_active ? "Deactivate" : "Activate"}
                  className={`w-8 h-8 rounded-lg grid place-items-center transition-colors ${
                    o.is_active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                  }`}
                >
                  {o.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(o)} className="w-8 h-8 rounded-lg bg-neutral-100 grid place-items-center hover:bg-neutral-200">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(o)}
                  disabled={busyId === o.id}
                  className="w-8 h-8 rounded-lg bg-red-50 text-red-500 grid place-items-center hover:bg-red-100 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{editId ? "Edit Bank Offer" : "New Bank Offer"}</h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Bank name *</label>
                  <input className={inputCls} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className={labelCls}>Card type *</label>
                  <select className={inputCls} value={cardType} onChange={(e) => setCardType(e.target.value as "CREDIT" | "DEBIT" | "ALL")}>
                    <option value="CREDIT">Credit cards</option>
                    <option value="DEBIT">Debit cards</option>
                    <option value="ALL">Credit & Debit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Discount text *</label>
                <input
                  className={inputCls}
                  value={discountText}
                  onChange={(e) => setDiscountText(e.target.value)}
                  placeholder="e.g. 10% instant discount up to ₹1,500"
                />
                <p className="mt-1 text-xs text-neutral-400">Shown verbatim on the storefront. The discount itself is settled by the bank.</p>
              </div>

              <div>
                <label className={labelCls}>Poster image (optional)</label>
                <div className="flex items-center gap-3">
                  {posterUrl ? (
                    <div className="relative">
                      <img src={posterUrl} alt="Poster preview" className="h-16 w-28 object-cover rounded-lg border border-neutral-200" />
                      <button
                        onClick={() => setPosterUrl("")}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral-900 text-white grid place-items-center"
                        title="Remove poster"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-28 rounded-lg border border-dashed border-neutral-300 grid place-items-center text-neutral-300">
                      <Landmark className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input className={inputCls} value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="or paste an image URL" />
                    <label className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePosterUpload(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Starts at</label>
                  <input className={inputCls} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Ends at</label>
                  <input className={inputCls} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Position (0 = first)</label>
                  <input className={inputCls} type="number" min="0" value={position} onChange={(e) => setPosition(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Click-through link (optional)</label>
                <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="/shop?category=audio" />
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
                <span className="text-sm font-semibold text-neutral-700">Active (visible on storefront)</span>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5 accent-amber-500" />
              </label>

              {/* Eligible products */}
              <div>
                <label className={labelCls}>Eligible products</label>
                <p className="text-xs text-neutral-400 mb-2 -mt-1">Leave empty to show the offer sitewide.</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search by name, brand, SKU, or tag…"
                  />
                </div>
                {searching && <p className="text-xs text-neutral-400 mt-1">Searching…</p>}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-neutral-200 rounded-xl overflow-hidden shadow-lg">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p)}
                        disabled={productIds.includes(p.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-left transition-colors border-b last:border-0 disabled:opacity-40"
                      >
                        {p.img && <img src={p.img} alt={p.name} className="w-10 h-10 object-contain rounded bg-neutral-100 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-neutral-500">
                            {p.brand} · ₹{(p.price / 100).toLocaleString("en-IN")}
                          </p>
                        </div>
                        {productIds.includes(p.id) ? (
                          <span className="text-xs text-green-600 font-semibold">Added</span>
                        ) : (
                          <Plus className="w-4 h-4 text-amber-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {productIds.length > 0 && (
                  <div className="space-y-2 mt-3 max-h-60 overflow-y-auto">
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      {productIds.length} eligible product{productIds.length !== 1 ? "s" : ""}
                    </label>
                    {productIds.map((pid, idx) => {
                      const p = productMeta[pid];
                      return (
                        <div key={pid} className="flex items-center gap-3 p-2 border border-neutral-100 rounded-lg bg-neutral-50">
                          <GripVertical className="w-4 h-4 text-neutral-300 shrink-0" />
                          {p?.img && <img src={p.img} alt={p?.name || pid} className="w-9 h-9 object-contain rounded bg-white shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p?.name || pid}</p>
                            {p && <p className="text-xs text-neutral-400">{p.brand}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => {
                                const arr = [...productIds];
                                if (idx > 0) {
                                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                  setProductIds(arr);
                                }
                              }}
                              disabled={idx === 0}
                              className="w-6 h-6 rounded hover:bg-neutral-200 grid place-items-center disabled:opacity-30"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const arr = [...productIds];
                                if (idx < arr.length - 1) {
                                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                  setProductIds(arr);
                                }
                              }}
                              disabled={idx === productIds.length - 1}
                              className="w-6 h-6 rounded hover:bg-neutral-200 grid place-items-center disabled:opacity-30"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeProduct(pid)} className="w-6 h-6 rounded hover:bg-red-100 text-red-500 grid place-items-center">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : editId ? "Update Offer" : "Create Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
