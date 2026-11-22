"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Sparkles, Image as ImageIcon, Plus, Trash2, ShieldCheck } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR, paiseToRupees } from "@/lib/money";
import { toast } from "sonner";

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
          }>(`/seller/products/${productId}`),
        ]);

        setCategories(Array.isArray(cats) ? cats : []);

        setName(prod.name || "");
        setBrand(prod.brand || "");
        setSku(prod.sku || "");
        setPrice((prod.price < 500000 ? prod.price / 100 : prod.price).toString());
        setMrp(prod.mrp ? (prod.mrp < 500000 ? prod.mrp / 100 : prod.mrp).toString() : "");
        setStock(prod.stock.toString());
        setStatus(prod.status || "ACTIVE");
        setDescription(prod.description || "");
        setWarrantyInfo(prod.warranty_info || "1 Year Manufacturer Domestic Warranty");
        setReturnPolicy(prod.return_policy || "7 Days Replacement Only");
        setImages(Array.isArray(prod.images) ? prod.images : []);
        setSpecs(Array.isArray(prod.specs) && prod.specs.length > 0 ? prod.specs : [{ name: "Brand", value: prod.brand || "" }]);

        if (prod.parent_category_id) {
          setSelectedMainCatId(prod.parent_category_id);
          setSelectedSubCatId(prod.category_id || "");
        } else {
          setSelectedMainCatId(prod.category_id || "");
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
            name: String(s?.name || s?.key || s?.attribute || "").trim(),
            value: String(s?.value || s?.val || "").trim(),
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
    setSpecs([...specs, { name: "", value: "" }]);
  };

  const handleSpecChange = (index: number, field: "name" | "value", val: string) => {
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
      .filter((s) => s && (s.name || "").trim() && (s.value || "").trim())
      .map((s) => ({ name: s.name.trim(), value: s.value.trim() }));

    setSaving(true);
    try {
      await apiClient.put(`/seller/products/${productId}`, {
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
      });

      toast.success("Product details and inventory updated successfully!");
      router.push("/products");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update product";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-neutral-200 animate-pulse rounded-lg" />
        <div className="h-64 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
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
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Edit Product Details
            </h1>
            <p className="text-xs text-neutral-500">
              Update catalog details, pricing, warranty, specs, and gallery.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateAI}
          disabled={isGeneratingAI}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          {isGeneratingAI ? "AI Generating..." : "✨ Auto-Fill with AI"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Product Info */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
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
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-50"
              >
                <option value="">
                  {(availableSubcategories || []).length > 0 ? "-- Choose Subcategory --" : "-- None --"}
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
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
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
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">MRP (₹)</label>
              <input
                type="number"
                min="1"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Listing Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Media Gallery */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <ImageIcon className="w-4 h-4 text-neutral-500" />
            Product Images
          </h2>

          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="https://... image URL"
              className="flex-1 rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <button
              type="button"
              onClick={handleAddImageUrl}
              className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 shadow-sm"
            >
              + Add Image
            </button>
          </div>

          {(images || []).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {(images || []).map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 overflow-hidden flex flex-col items-center"
                >
                  <div className="w-full h-28 flex items-center justify-center overflow-hidden rounded-lg bg-white">
                    <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="mt-2 w-full flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-500">{idx === 0 ? "★ Primary" : `#${idx + 1}`}</span>
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
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
            Description, Warranty & Specifications
          </h2>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">HTML Description</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-neutral-200 p-3 text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 leading-relaxed"
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
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Return Policy</label>
              <input
                type="text"
                required
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                + Add Spec Row
              </button>
            </div>

            {(specs || []).map((spec, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(idx, "name", e.target.value)}
                  placeholder="Attribute"
                  className="w-1/3 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                  placeholder="Value"
                  className="flex-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
