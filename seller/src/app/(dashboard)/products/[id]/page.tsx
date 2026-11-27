"use client";

import { useEffect, useState, useMemo } from"react";
import { useRouter, useParams } from"next/navigation";
import { ArrowLeft, Save, Sparkles, Image as ImageIcon, Plus, Trash2, ShieldCheck, Clock, X } from"lucide-react";
import { apiClient, ApiError } from"@/lib/api-client";
import { formatINR, paiseToRupees } from"@/lib/money";
import { toast } from"sonner";

interface CategoryNode {
 id: string;
 name: string;
 slug: string;
 parent_id?: string | null;
 children?: CategoryNode[];
}

export default function EditProductPage() {
 const router = useRouter();
 const params = useParams();
 const productId = params?.id as string;

 const [loading, setLoading] = useState(true);
 const [categories, setCategories] = useState<CategoryNode[]>([]);

 // Form State
 const [name, setName] = useState("");
 const [brand, setBrand] = useState("");
 const [sku, setSku] = useState("");
 const [price, setPrice] = useState("");
 const [mrp, setMrp] = useState("");
 const [stock, setStock] = useState("");
 const [status, setStatus] = useState("ACTIVE");
 const [description, setDescription] = useState("");
 const [warrantyInfo, setWarrantyInfo] = useState("");
 const [returnPolicy, setReturnPolicy] = useState("");

 const [selectedMainCatId, setSelectedMainCatId] = useState("");
 const [selectedSubCatId, setSelectedSubCatId] = useState("");

 // Media
 const [imageUrlInput, setImageUrlInput] = useState("");
 const [images, setImages] = useState<string[]>([]);

 // Specs
 const [specs, setSpecs] = useState<Array<{ name: string; value: string }>>([]);

 const [isGeneratingAI, setIsGeneratingAI] = useState(false);
 const [saving, setSaving] = useState(false);
 // False when another seller entered this product in the shared ELEKTRIX
 // catalog: this seller may then edit only price/stock/visibility, and any
 // catalog edit is submitted for admin approval instead of applied directly.
 const [isAuthor, setIsAuthor] = useState(true);
 const [pendingChange, setPendingChange] = useState<{
 id: string;
 changes: Record<string, unknown>;
 created_at?: string | null;
 } | null>(null);

 // Load Categories & Product Details
 useEffect(() => {
 async function loadData() {
 try {
 setLoading(true);
 const [cats, prod] = await Promise.all([
 apiClient.get<CategoryNode[]>("/seller/categories"),
 apiClient.get<{
 id: string;
 name: string;
 brand?: string;
 sku?: string;
 price: number;
 mrp?: number;
 stock: number;
 status: string;
 category_id?: string;
 parent_category_id?: string;
 description?: string;
 warranty_info?: string;
 return_policy?: string;
 specs?: Array<{ name: string; value: string }>;
 images?: string[];
 is_author?: boolean;
 pending_change?: {
 id: string;
 changes: Record<string, unknown>;
 created_at?: string | null;
 } | null;
 }>(`/seller/products/${productId}`),
 ]);

 setCategories(Array.isArray(cats) ? cats : []);
 setIsAuthor(prod.is_author !== false);
 setPendingChange(prod.pending_change || null);

 setName(prod.name ||"");
 setBrand(prod.brand ||"");
 setSku(prod.sku ||"");
 setPrice((prod.price < 500000 ? prod.price / 100 : prod.price).toString());
 setMrp(prod.mrp ? (prod.mrp < 500000 ? prod.mrp / 100 : prod.mrp).toString() :"");
 setStock(prod.stock.toString());
 setStatus(prod.status ||"ACTIVE");
 setDescription(prod.description ||"");
 setWarrantyInfo(prod.warranty_info ||"1 Year Manufacturer Domestic Warranty");
 setReturnPolicy(prod.return_policy ||"7 Days Replacement Only");
 setImages(Array.isArray(prod.images) ? prod.images : []);
 setSpecs(Array.isArray(prod.specs) && prod.specs.length > 0 ? prod.specs : [{ name:"Brand", value: prod.brand ||"" }]);

 if (prod.parent_category_id) {
 setSelectedMainCatId(prod.parent_category_id);
 setSelectedSubCatId(prod.category_id ||"");
 } else {
 setSelectedMainCatId(prod.category_id ||"");
 }
 } catch (err) {
 toast.error("Failed to load product details");
 router.push("/products");
 } finally {
 setLoading(false);
 }
 }
 if (productId) loadData();
 }, [productId, router]);

 // Catalog fields stay editable for a listing-only seller, but their changes
 // go to ELEKTRIX for approval instead of taking effect immediately. The amber
 // treatment tells them that before they type.
 const catalogLocked = isAuthor
 ?""
 :"bg-amber-50/40 border-amber-200";
 // Only the author's`status`choice changes the shared product; for anyone
 // else it applies to their own listing and is saved immediately.
 const statusPendingHint = !isAuthor;

 const withdrawPendingChange = async () => {
 if (!pendingChange) return;
 try {
 await apiClient.delete(`/seller/change-requests/${pendingChange.id}`);
 setPendingChange(null);
 toast.success("Pending change withdrawn.");
 } catch (err) {
 toast.error(err instanceof ApiError ? err.message :"Could not withdraw the request");
 }
 };

 const availableSubcategories = useMemo(() => {
 if (!selectedMainCatId || !Array.isArray(categories)) return [];
 const mainCat = categories.find((c) => c && c.id === selectedMainCatId);
 return Array.isArray(mainCat?.children) ? mainCat.children : [];
 }, [categories, selectedMainCatId]);

 const handleGenerateAI = async () => {
 if (!name.trim()) {
 toast.error("Please enter a product title or keyword first");
 return;
 }
 setIsGeneratingAI(true);
 toast.info("Refining product details with AI...");
 try {
 const res = await apiClient.post<{
 title: string;
 description_html: string;
 specs: Array<{ name: string; value: string }>;
 warranty_info: string;
 return_policy: string;
 }>("/seller/catalog/ai-generate", {
 name: name.trim(),
 brand: brand.trim() || undefined,
 existing_desc: description.trim() || undefined,
 });

 if (res.title) setName(res.title);
 if (res.description_html) setDescription(res.description_html);
 if (res.warranty_info) setWarrantyInfo(res.warranty_info);
 if (res.return_policy) setReturnPolicy(res.return_policy);
 if (res.specs && Array.isArray(res.specs)) {
 const cleanSpecs = res.specs
 .filter(Boolean)
 .map((s: any) => ({
 name: String(s?.name || s?.key || s?.attribute ||"").trim(),
 value: String(s?.value || s?.val ||"").trim(),
 }))
 .filter((s) => s.name && s.value);
 if (cleanSpecs.length > 0) {
 setSpecs(cleanSpecs);
 }
 }

 toast.success("AI generated updated title, HTML description, specs & warranty!");
 } catch {
 toast.error("AI generation failed");
 } finally {
 setIsGeneratingAI(false);
 }
 };

 const handleAddImageUrl = () => {
 const url = imageUrlInput.trim();
 if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
 toast.error("Please enter a valid image URL (http/https)");
 return;
 }
 setImages((prev) => [...prev, url]);
 setImageUrlInput("");
 toast.success("Image URL added");
 };

 const handleRemoveImage = (index: number) => {
 setImages(images.filter((_, i) => i !== index));
 };

 const handleAddSpec = () => {
 setSpecs([...specs, { name:"", value:"" }]);
 };

 const handleSpecChange = (index: number, field:"name" |"value", val: string) => {
 const updated = [...specs];
 updated[index][field] = val;
 setSpecs(updated);
 };

 const handleRemoveSpec = (index: number) => {
 setSpecs(specs.filter((_, i) => i !== index));
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const pNum = Number(price);
 if (!price || isNaN(pNum) || pNum <= 0) {
 toast.error("Please enter a valid selling price");
 return;
 }
 const sNum = Number(stock);
 if (isNaN(sNum) || sNum < 0) {
 toast.error("Stock units cannot be negative");
 return;
 }

 const finalCategoryId = selectedSubCatId || selectedMainCatId || null;
 const filteredSpecs = (specs || [])
 .filter((s) => s && (s.name ||"").trim() && (s.value ||"").trim())
 .map((s) => ({ name: s.name.trim(), value: s.value.trim() }));

 setSaving(true);
 try {
 // Price and stock are this seller's own offer and apply immediately.
 // Every other field is shared catalog data: for the author (or staff) it
 // saves straight away, for any other seller the API stores it as a
 // pending change request for ELEKTRIX to approve.
 const payload: Record<string, unknown> = {
 name: name.trim(),
 brand: brand.trim() || undefined,
 category_id: finalCategoryId,
 price: pNum,
 mrp: mrp ? Number(mrp) : undefined,
 stock: sNum,
 status: status,
 description: description.trim() || undefined,
 warranty_info: warrantyInfo.trim() || undefined,
 return_policy: returnPolicy.trim() || undefined,
 specs: filteredSpecs,
 images: images || [],
 };

 const res = await apiClient.put<{
 status?: string;
 change_request_id?: string;
 message?: string;
 }>(`/seller/products/${productId}`, payload);

 if (res?.status ==="pending_approval") {
 toast.success(
 res.message ||
"Your price and stock were saved. Catalog details are waiting for ELEKTRIX approval.",
 );
 } else {
 toast.success(
 isAuthor
 ?"Product details and inventory updated successfully!"
 :"Your price and stock were updated successfully!",
 );
 }
 router.push("/products");
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to update product";
 toast.error(msg);
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return (
 <div className="max-w-4xl mx-auto space-y-4">
 <div className="h-8 w-48 bg-neutral-200 animate-pulse rounded-md" />
 <div className="h-64 bg-white border border-neutral-200 rounded-md animate-pulse" />
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={() => router.push("/products")}
 className="p-2 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 <div>
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
 Edit Product Details
 </h1>
 <p className="text-xs text-neutral-500">
 {isAuthor
 ?"Update catalog details, pricing, warranty, specs, and gallery."
 :"Price and stock save instantly. Edits to shared catalog details are sent to ELEKTRIX for approval before they go live."}
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={handleGenerateAI}
 disabled={isGeneratingAI}
 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-50"
 >
 <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
 {isGeneratingAI ?"AI Generating..." :"Auto-Fill with AI"}
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Pending catalog change */}
 {pendingChange && (
 <div className="rounded-md border border-amber-200 bg-amber-50 p-5">
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3">
 <Clock className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
 <div>
 <h2 className="text-sm font-semibold text-amber-900">
 Waiting for ELEKTRIX approval
 </h2>
 <p className="mt-1 text-xs text-amber-800">
 You proposed catalog changes on{""}
 {pendingChange.created_at
 ? new Date(pendingChange.created_at).toLocaleDateString("en-IN", {
 day:"2-digit",
 month:"short",
 year:"numeric",
 })
 :"this product"}
 . They go live once ELEKTRIX approves them. Until then the
 current values below stay published.
 </p>
 <ul className="mt-2 space-y-1">
 {Object.keys(pendingChange.changes || {}).map((key) => (
 <li key={key} className="text-xs text-amber-900">
 <span className="font-semibold capitalize">{key.replace(/_/g,"")}</span>
 <span className="text-amber-700"> — pending review</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 <button
 type="button"
 onClick={withdrawPendingChange}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-amber-200 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-50 shrink-0"
 >
 <X className="w-3 h-3" />
 Withdraw
 </button>
 </div>
 </div>
 )}
 {/* Core Product Info */}
 <div className="rounded-md border border-neutral-200 bg-white p-6 space-y-4">
 <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
 Product Title & Brand
 </h2>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">Brand Name</label>
 <input
 type="text"
 required
 value={brand}
 onChange={(e) => setBrand(e.target.value)}
 placeholder="e.g. Apple, Sony"
 className={`ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 ${catalogLocked}`}
 />
 </div>

 <div className="sm:col-span-2">
 <label className="block text-xs font-semibold text-neutral-700">Product Title</label>
 <input
 type="text"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Title"
 className={`ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 py-2.5 text-sm font-semibold text-neutral-900 ${catalogLocked}`}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">Category</label>
 <select
 value={selectedMainCatId}
 onChange={(e) => {
 setSelectedMainCatId(e.target.value);
 setSelectedSubCatId("");
 }}
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-xs text-neutral-900"
 >
 <option value="">-- Choose Category --</option>
 {(categories || []).map((c) => (
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">Subcategory</label>
 <select
 value={selectedSubCatId}
 onChange={(e) => setSelectedSubCatId(e.target.value)}
 disabled={!selectedMainCatId || (availableSubcategories || []).length === 0}
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-xs text-neutral-900 disabled:bg-neutral-50"
 >
 <option value="">
 {(availableSubcategories || []).length > 0 ?"-- Choose Subcategory --" :"-- None --"}
 </option>
 {(availableSubcategories || []).map((sub) => (
 <option key={sub.id} value={sub.id}>
 {sub.name}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* Pricing & Stock */}
 <div className="rounded-md border border-neutral-200 bg-white p-6 space-y-4">
 <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
 Pricing, Stock & Status
 </h2>

 <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">Selling Price (₹)</label>
 <input
 type="number"
 required
 min="1"
 value={price}
 onChange={(e) => setPrice(e.target.value)}
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm font-semibold text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">MRP (₹)</label>
 <input
 type="number"
 min="1"
 value={mrp}
 onChange={(e) => setMrp(e.target.value)}
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">Stock Units</label>
 <input
 type="number"
 required
 min="0"
 value={stock}
 onChange={(e) => setStock(e.target.value)}
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm font-semibold text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">Listing Status</label>
 <select
 value={status}
 onChange={(e) => setStatus(e.target.value)}
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3 text-xs text-neutral-900"
 >
 <option value="ACTIVE">ACTIVE</option>
 <option value="DRAFT">DRAFT</option>
 <option value="ARCHIVED">ARCHIVED</option>
 </select>
 {statusPendingHint && (
 <p className="mt-1 text-xs text-neutral-500">
 Controls your own offer, saved immediately.
 </p>
 )}
 </div>
 </div>
 </div>

 {/* Media Gallery */}
 <div className="rounded-md border border-neutral-200 bg-white p-6 space-y-4">
 <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
 <ImageIcon className="w-4 h-4 text-neutral-500" />
 Product Images
 </h2>

 <div className="flex gap-2">
 <input
 type="url"
 value={imageUrlInput}
 onChange={(e) => setImageUrlInput(e.target.value)}
 placeholder="https://... image URL"
 className="ex-input flex-1 rounded-md border border-neutral-200 px-3.5 text-xs text-neutral-900"
 />
 <button
 type="button"
 onClick={handleAddImageUrl}
 className="px-4 py-2 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700"
 >
 + Add Image
 </button>
 </div>

 {(images || []).length > 0 && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
 {(images || []).map((imgUrl, idx) => (
 <div
 key={idx}
 className="rounded-md border border-neutral-200 bg-neutral-50 p-2 overflow-hidden flex flex-col items-center"
 >
 <div className="w-full h-28 flex items-center justify-center overflow-hidden rounded-md bg-white">
 <img src={imgUrl} alt="" className="w-full h-full object-contain" />
 </div>
 <div className="mt-2 w-full flex items-center justify-between text-xs">
 <span className="font-semibold text-neutral-500">{idx === 0 ?"Primary" :`#${idx + 1}`}</span>
 <button
 type="button"
 onClick={() => handleRemoveImage(idx)}
 className="text-red-500 hover:text-red-700"
 >
 Remove
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Description, Warranty, Specs */}
 <div className="rounded-md border border-neutral-200 bg-white p-6 space-y-4">
 <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
 Description, Warranty & Specifications
 </h2>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">HTML Description</label>
 <textarea
 rows={5}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className={`ex-input mt-1.5 w-full rounded-md border border-neutral-200 p-3 text-xs font-mono text-neutral-900 leading-relaxed ${catalogLocked}`}
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">Warranty Information</label>
 <input
 type="text"
 required
 value={warrantyInfo}
 onChange={(e) => setWarrantyInfo(e.target.value)}
 className={`ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 ${catalogLocked}`}
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">Return Policy</label>
 <input
 type="text"
 required
 value={returnPolicy}
 onChange={(e) => setReturnPolicy(e.target.value)}
 className={`ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 ${catalogLocked}`}
 />
 </div>
 </div>

 {/* Specs */}
 <div className="pt-2 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-neutral-700">Technical Specifications</span>
 <button
 type="button"
 onClick={handleAddSpec}
 className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
 >
 + Add Spec Row
 </button>
 </div>

 {(specs || []).map((spec, idx) => (
 <div key={idx} className="flex items-center gap-2.5">
 <input
 type="text"
 value={spec.name}
 onChange={(e) => handleSpecChange(idx,"name", e.target.value)}
 placeholder="Attribute"
 className="ex-input w-1/3 rounded-md border border-neutral-200 px-3 text-xs text-neutral-900"
 />
 <input
 type="text"
 value={spec.value}
 onChange={(e) => handleSpecChange(idx,"value", e.target.value)}
 placeholder="Value"
 className="ex-input flex-1 rounded-md border border-neutral-200 px-3 text-xs text-neutral-900"
 />
 {(specs || []).length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveSpec(idx)}
 className="p-1.5 text-neutral-400 hover:text-red-600"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 ))}
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => router.push("/products")}
 className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving}
 className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-50"
 >
 <Save className="w-3.5 h-3.5" />
 {saving ?"Saving Changes..." :"Save Changes"}
 </button>
 </div>
 </form>
 </div>
 );
}
