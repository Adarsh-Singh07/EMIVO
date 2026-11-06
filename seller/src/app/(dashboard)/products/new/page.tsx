"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  PlusCircle, 
  ArrowLeft, 
  Package, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  Plus, 
  Trash2,
  FolderPlus,
  HelpCircle
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  children?: CategoryNode[];
}

function toTitleCase(str: string): string {
  const upperWords = ["PC", "PCS", "GPS", "TWS", "ANC", "5G", "4G", "AMOLED", "LED", "USB", "HD", "4K", "TV", "AC"];
  const lowerWords = ["and", "or", "of", "in", "for", "with", "the", "a", "an"];
  
  return str
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      const up = word.toUpperCase();
      if (upperWords.includes(up)) return up;
      const low = word.toLowerCase();
      if (idx > 0 && lowerWords.includes(low)) return low;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  
  // Cascading Category Dropdown State
  const [selectedMainCatId, setSelectedMainCatId] = useState("");
  const [selectedSubCatId, setSelectedSubCatId] = useState("");

  // Media URLs
  const [images, setImages] = useState<string[]>([""]);

  // Specifications
  const [specs, setSpecs] = useState<Array<{ name: string; value: string }>>([
    { name: "", value: "" },
  ]);

  // Category Suggestion Modal
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestIsSubcategory, setSuggestIsSubcategory] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Load category tree
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoadingCats(true);
        const data = await apiClient.get<CategoryNode[]>("/seller/categories");
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Failed to load category list");
      } finally {
        setLoadingCats(false);
      }
    }
    fetchCategories();
  }, []);

  // Compute subcategories for selected main category
  const availableSubcategories = useMemo(() => {
    if (!selectedMainCatId) return [];
    const mainCat = categories.find((c) => c.id === selectedMainCatId);
    return mainCat?.children || [];
  }, [categories, selectedMainCatId]);

  // Handle main category change
  const handleMainCategoryChange = (catId: string) => {
    setSelectedMainCatId(catId);
    setSelectedSubCatId(""); // Reset subcategory when main category changes
  };

  // Add / Remove media inputs
  const handleAddImage = () => {
    setImages([...images, ""]);
  };

  const handleImageChange = (index: number, val: string) => {
    const updated = [...images];
    updated[index] = val;
    setImages(updated);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Add / Remove spec rows
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

  // Handle Category Suggestion
  const handleSuggestCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const titleCased = toTitleCase(suggestName);
    setSuggesting(true);
    try {
      const parentId = suggestIsSubcategory ? (selectedMainCatId || null) : null;
      const res = await apiClient.post<{
        id: string;
        name: string;
        status: string;
        message: string;
      }>("/seller/categories/suggest", {
        name: titleCased,
        parent_id: parentId,
      });

      toast.success(res.message || "Category suggestion submitted for admin review");

      // Add temporarily to local category state so seller can immediately select it
      if (parentId) {
        setCategories((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                children: [...(c.children || []), { id: res.id, name: res.name, slug: res.id, parent_id: parentId }],
              };
            }
            return c;
          })
        );
        setSelectedSubCatId(res.id);
      } else {
        setCategories((prev) => [
          ...prev,
          { id: res.id, name: res.name, slug: res.id, children: [] },
        ]);
        setSelectedMainCatId(res.id);
      }

      setShowSuggestModal(false);
      setSuggestName("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to suggest category";
      toast.error(msg);
    } finally {
      setSuggesting(false);
    }
  };

  // Submit product creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Product title is required");
      return;
    }

    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid selling price");
      return;
    }

    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      toast.error("Stock units cannot be negative");
      return;
    }

    // Determine category ID: prefer selected subcategory; if none, use selected main category
    const finalCategoryId = selectedSubCatId || selectedMainCatId || null;

    const filteredImages = images.filter((img) => img.trim().length > 0);
    const filteredSpecs = specs.filter((s) => s.name.trim() && s.value.trim());

    setSubmitting(true);
    try {
      await apiClient.post("/seller/products", {
        name: toTitleCase(name),
        brand: brand.trim() || undefined,
        sku: sku.trim() || undefined,
        price: priceNum,
        mrp: mrp ? Number(mrp) : undefined,
        stock: stockNum,
        category_id: finalCategoryId,
        description: description.trim() || undefined,
        images: filteredImages,
        specs: filteredSpecs,
      });

      toast.success("Product created and published to your inventory!");
      router.push("/products");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create product";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/products"
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Add New Product
            </h1>
            <p className="text-xs text-slate-500">
              List a new item in your Elektrix seller inventory with title, category, pricing, and stock.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Package className="w-4 h-4 text-amber-500" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName(toTitleCase(name))}
                placeholder="e.g. Wireless Noise Cancelling Headphones Over Ear"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Titles are automatically formatted with proper Title Casing.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Brand Name
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Sony, Boat, Apple, Elektrix"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                SKU / Barcode (Optional)
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Leave blank to auto-generate"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Categories Section (Cascading Dropdowns) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-500" />
                Category & Classification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select main category, then choose subcategory from the dynamic dropdown.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuggestModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              Suggest New Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Main Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                1. Main Category
              </label>
              <select
                value={selectedMainCatId}
                onChange={(e) => handleMainCategoryChange(e.target.value)}
                disabled={loadingCats}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Choose Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Dropdown (Cascading) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                2. Subcategory
              </label>
              <select
                value={selectedSubCatId}
                onChange={(e) => setSelectedSubCatId(e.target.value)}
                disabled={!selectedMainCatId || availableSubcategories.length === 0}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {selectedMainCatId
                    ? availableSubcategories.length > 0
                      ? "-- Choose Subcategory --"
                      : "-- No subcategories (main category will be used) --"
                    : "-- First select Main Category above --"}
                </option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Pricing & Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1.5 relative rounded-xl">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="999"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Price customer pays at checkout.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                List Price / MRP (₹)
              </label>
              <div className="mt-1.5 relative rounded-xl">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="1499"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Shown crossed out if higher than selling price.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Stock On Hand <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="25"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Available units in your warehouse.</p>
            </div>
          </div>
        </div>

        {/* Media Images Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              Product Images
            </h2>
            <button
              type="button"
              onClick={handleAddImage}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add another image URL
            </button>
          </div>

          <div className="space-y-3">
            {images.map((url, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleImageChange(idx, e.target.value)}
                  placeholder="https://images.unsplash.com/... or CDN image URL"
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Description & Specs Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Description & Specifications
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Product Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlight key features, benefits, usage instructions, and product specifications..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Specifications (Key & Value pairs)
              </span>
              <button
                type="button"
                onClick={handleAddSpec}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                + Add specification
              </button>
            </div>

            {specs.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(idx, "name", e.target.value)}
                  placeholder="Spec name (e.g. Color)"
                  className="w-1/3 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                  placeholder="Value (e.g. Midnight Black)"
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {specs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSpec(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <a
            href="/products"
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-block animate-spin mr-1">⟳</span>
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            Publish to Catalog
          </button>
        </div>
      </form>

      {/* Suggest Category Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-500" />
                Suggest New Category
              </h3>
              <button
                onClick={() => setShowSuggestModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              New category proposals are sent to the Elektrix Admin Approvals queue. You will be able to immediately assign this product to it.
            </p>

            <form onSubmit={handleSuggestCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  onBlur={() => setSuggestName(toTitleCase(suggestName))}
                  placeholder="e.g. Smart Wearables or Organic Spices"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {selectedMainCatId && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-2">
                  <p className="font-semibold text-slate-700">Hierarchy Placement:</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cat_type"
                      checked={suggestIsSubcategory}
                      onChange={() => setSuggestIsSubcategory(true)}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span>
                      Subcategory under <strong className="text-slate-900">{categories.find((c) => c.id === selectedMainCatId)?.name}</strong>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cat_type"
                      checked={!suggestIsSubcategory}
                      onChange={() => setSuggestIsSubcategory(false)}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span>Stand-alone New Main Category</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suggesting}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {suggesting ? "Submitting..." : "Submit Suggestion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
