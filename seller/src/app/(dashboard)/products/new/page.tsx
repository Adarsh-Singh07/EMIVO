"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Search, 
  Sparkles, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  HelpCircle, 
  FolderPlus, 
  Check, 
  Layers, 
  ShieldCheck, 
  Truck, 
  Tag, 
  ExternalLink,
  Store,
  AlertCircle
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  children?: CategoryNode[];
}

interface CatalogMatchItem {
  id: string;
  name: string;
  brand?: string;
  category_id?: string;
  category_name?: string;
  price: number;
  mrp?: number;
  image?: string;
  lowest_offer_price: number;
  seller_count: number;
}

function toTitleCase(str: string): string {
  const upperWords = ["PC", "PCS", "GPS", "TWS", "ANC", "5G", "4G", "AMOLED", "LED", "USB", "HD", "4K", "TV", "AC", "GB", "TB", "RAM"];
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

function estimateTransitDays(pin?: string | null): number {
  if (!pin) return 3;
  const cleanPin = pin.trim().replace(/\D/g, "");
  if (cleanPin.length < 2) return 3;
  const prefix2 = cleanPin.slice(0, 2);
  // Major Metros (Delhi 11, Mumbai 40, Pune 41, Bengaluru 56, Chennai 60, Kolkata 70, Hyderabad 50, Ahmedabad 38)
  if (["11", "40", "41", "56", "60", "70", "50", "38"].includes(prefix2)) {
    return 2;
  }
  // Remote/Hill/Northeast (J&K 18, 19, NE 79, Andaman 74)
  if (["18", "19", "79", "74"].includes(prefix2)) {
    return 5;
  }
  // Regional Standard
  return 3;
}

export default function AddProductPage() {
  const router = useRouter();

  // Mode: "SEARCH_FIRST" (Default - Find in Catalog) vs "CREATE_NEW" (Create new master product)
  const [mode, setMode] = useState<"SEARCH_FIRST" | "CREATE_NEW">("SEARCH_FIRST");

  // ---------------------------------------------------------------------------
  // MODE 1: Search & Match Existing Catalog
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogMatchItem[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);

  // Offer Attachment Sheet/Modal State
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogMatchItem | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMrp, setOfferMrp] = useState("");
  const [offerStock, setOfferStock] = useState("10");
  const [offerCondition, setOfferCondition] = useState("NEW");
  const [offerDeliveryDays, setOfferDeliveryDays] = useState("3");
  const [offerSku, setOfferSku] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Warehouse Details & Auto-Estimated Transit Days
  const [warehousePincode, setWarehousePincode] = useState<string>("");
  const [warehouseCity, setWarehouseCity] = useState<string>("");
  const [estimatedTransitDays, setEstimatedTransitDays] = useState<number>(3);

  // ---------------------------------------------------------------------------
  // MODE 2: Create New Master Product
  // ---------------------------------------------------------------------------
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState("1 Year Manufacturer Domestic Warranty");
  const [returnPolicy, setReturnPolicy] = useState("7 Days Replacement Only");

  // Cascading Category Dropdown State
  const [selectedMainCatId, setSelectedMainCatId] = useState("");
  const [selectedSubCatId, setSelectedSubCatId] = useState("");

  // Media URLs & Gallery
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // Specifications
  const [specs, setSpecs] = useState<Array<{ name: string; value: string }>>([
    { name: "Brand", value: "" },
    { name: "Model", value: "" },
  ]);

  // AI Generation State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Category Suggestion Modal
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestIsSubcategory, setSuggestIsSubcategory] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  const [submittingProduct, setSubmittingProduct] = useState(false);

  // Load seller profile & warehouse pincode for auto-estimating transit days
  useEffect(() => {
    async function fetchSellerProfile() {
      try {
        const profile = await apiClient.get<any>("/seller/me");
        if (profile) {
          const pin = profile.pincode || "";
          setWarehousePincode(pin);
          setWarehouseCity(profile.city || "");
          const est = estimateTransitDays(pin);
          setEstimatedTransitDays(est);
          setOfferDeliveryDays(est.toString());
        }
      } catch {
        // Fallback default
      }
    }
    fetchSellerProfile();
  }, []);

  // Load category tree
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoadingCats(true);
        let data: CategoryNode[] = [];
        try {
          data = await apiClient.get<CategoryNode[]>("/seller/categories");
        } catch {
          data = await apiClient.get<CategoryNode[]>("/categories");
        }
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

  // Search existing catalog
  const handleCatalogSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() && !brandFilter.trim()) {
      toast.error("Please enter a product name or brand to search");
      return;
    }

    setSearchingCatalog(true);
    try {
      const q = encodeURIComponent(searchQuery.trim());
      const b = encodeURIComponent(brandFilter.trim());
      const data = await apiClient.get<CatalogMatchItem[]>(`/seller/catalog/search?q=${q}&brand=${b}`);
      setCatalogResults(Array.isArray(data) ? data : []);
      if (!data || data.length === 0) {
        toast.info("No matching products found in catalog. You can create a new listing below.");
      }
    } catch (err) {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearchingCatalog(false);
    }
  };

  // Open offer modal for matched product
  const handleOpenOfferModal = (item: CatalogMatchItem) => {
    setSelectedCatalogProduct(item);
    setOfferPrice((item.lowest_offer_price / 100).toString());
    setOfferMrp(item.mrp ? (item.mrp / 100).toString() : (item.lowest_offer_price / 100).toString());
    setOfferStock("10");
    setOfferSku("");
    setOfferDeliveryDays(estimatedTransitDays.toString());
  };

  // Submit Offer on Existing Product
  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogProduct) return;

    const pNum = Number(offerPrice);
    if (!offerPrice || isNaN(pNum) || pNum <= 0) {
      toast.error("Please enter a valid selling price");
      return;
    }
    const sNum = Number(offerStock);
    if (isNaN(sNum) || sNum < 0) {
      toast.error("Stock units cannot be negative");
      return;
    }

    setSubmittingOffer(true);
    try {
      await apiClient.post("/seller/catalog/attach-offer", {
        product_id: selectedCatalogProduct.id,
        price: pNum,
        mrp: offerMrp ? Number(offerMrp) : undefined,
        stock: sNum,
        sku: offerSku.trim() || undefined,
        condition: offerCondition,
        estimated_delivery_days: Number(offerDeliveryDays) || 3,
      });

      toast.success(`Your offer for "${selectedCatalogProduct.name}" has been listed!`);
      router.push("/products");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to attach seller offer";
      toast.error(msg);
    } finally {
      setSubmittingOffer(false);
    }
  };

  // ---------------------------------------------------------------------------
  // AI Agent: Auto-Fill Title, HTML Description, Specs, Warranty & Return Policy
  // ---------------------------------------------------------------------------
  const handleGenerateAI = async () => {
    if (!name.trim()) {
      toast.error("Please enter a product title or keyword first (e.g. Sony WH-1000XM5)");
      return;
    }

    setIsGeneratingAI(true);
    toast.info("Generating professional e-commerce details using AI...");
    try {
      const res = await apiClient.post<{
        title: string;
        description_html: string;
        specs: Array<{ name: string; value: string }>;
        warranty_info: string;
        return_policy: string;
        suggested_category?: string;
        suggested_subcategory?: string;
      }>("/seller/catalog/ai-generate", {
        name: name.trim(),
        brand: brand.trim() || undefined,
        existing_desc: description.trim() || undefined,
      });

      if (res.title) {
        let cleanTitle = res.title.replace(/\s+(Smartphone|Smart Phone|Mobile Phone|Mobile|Cell Phone|Phone|Device|Item|Product)\b/gi, "").trim();
        cleanTitle = cleanTitle.replace(/\s*,\s*(Smartphone|Smart Phone|Mobile Phone|Phone)\s*\)/gi, ")");
        setName(toTitleCase(cleanTitle));
      }
      if (res.description_html) setDescription(res.description_html);
      if (res.warranty_info) setWarrantyInfo(res.warranty_info);
      if (res.return_policy) setReturnPolicy(res.return_policy);
      if (res.specs && Array.isArray(res.specs) && res.specs.length > 0) {
        setSpecs(res.specs);
      }

      toast.success("AI generated title, rich HTML description, specs & warranty!");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "AI generation failed";
      toast.error(msg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Media Gallery Helpers
  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) {
      toast.error("Please enter an image URL");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast.error("Image URL must start with http:// or https://");
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageUrlInput("");
    toast.success("Image URL added to gallery");
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Specs Helpers
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

  // Suggest Category
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
      const res = await apiClient.post<{ id: string; name: string; status: string; message: string }>(
        "/seller/categories/suggest",
        { name: titleCased, parent_id: parentId }
      );

      toast.success(res.message || "Category suggestion submitted for admin review");
      setShowSuggestModal(false);
      setSuggestName("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to suggest category";
      toast.error(msg);
    } finally {
      setSuggesting(false);
    }
  };

  // Submit Brand New Product Listing
  const handleCreateNewProduct = async (e: React.FormEvent) => {
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

    const finalCategoryId = selectedSubCatId || selectedMainCatId || null;
    const filteredSpecs = specs.filter((s) => s.name.trim() && s.value.trim());

    setSubmittingProduct(true);
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
        warranty_info: warrantyInfo.trim() || undefined,
        return_policy: returnPolicy.trim() || undefined,
        images: images,
        specs: filteredSpecs,
      });

      toast.success("Product created and published to your inventory!");
      router.push("/products");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create product";
      toast.error(msg);
    } finally {
      setSubmittingProduct(false);
    }
  };

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
              Add Products to Inventory
            </h1>
            <p className="text-xs text-neutral-500">
              Search Elektrix catalog to sell an existing product or publish a new master listing.
            </p>
          </div>
        </div>

        {/* Workflow Mode Switcher */}
        <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200">
          <button
            type="button"
            onClick={() => setMode("SEARCH_FIRST")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "SEARCH_FIRST"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Find in Catalog
          </button>
          <button
            type="button"
            onClick={() => setMode("CREATE_NEW")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "CREATE_NEW"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            + Create New Listing
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MODE 1: SEARCH & SELL EXISTING PRODUCT IN CATALOG                     */}
      {/* --------------------------------------------------------------------- */}
      {mode === "SEARCH_FIRST" && (
        <div className="space-y-6">
          {/* Search Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-600" />
                Search Existing Elektrix Master Catalog
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Save time: If an item already exists in the catalog, you don&apos;t need to write descriptions or upload photos. Just enter your price and stock.
              </p>
            </div>

            <form onSubmit={handleCatalogSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  placeholder="Filter Brand (e.g. Apple, Sony)"
                  className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name or model (e.g. iPhone 15, Headphones)..."
                  className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={searchingCatalog}
                  className="w-full h-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {searchingCatalog ? "Searching..." : "Search"}
                </button>
              </div>
            </form>
          </div>

          {/* Results Grid */}
          {catalogResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Matching Catalog Items ({catalogResults.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catalogResults.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-300 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-16 h-16 rounded-xl bg-neutral-50 border border-neutral-100 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-neutral-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {item.brand && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
                            {item.brand}
                          </span>
                        )}
                        <h4 className="text-sm font-semibold text-neutral-900 mt-1 line-clamp-2">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          <span className="font-bold text-neutral-900">
                            Lowest: {formatINR(item.lowest_offer_price)}
                          </span>
                          <span className="text-neutral-400">• {item.seller_count} active seller(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400 truncate">
                        {item.category_name || "General"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenOfferModal(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
                      >
                        Sell This Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Create New Banner if search returned nothing */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">Can&apos;t find your product in the catalog?</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              If this is a completely new brand or SKU not yet sold on Elektrix, create a master listing. Our AI agent will help format the specifications and description automatically.
            </p>
            <button
              type="button"
              onClick={() => setMode("CREATE_NEW")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs font-semibold hover:bg-neutral-100 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Master Product
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: FAST OFFER ATTACHMENT                                          */}
      {/* --------------------------------------------------------------------- */}
      {selectedCatalogProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">List Your Offer</h3>
                <p className="text-xs text-neutral-500">Provide your price & stock for this catalog item.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCatalogProduct(null)}
                className="text-neutral-400 hover:text-neutral-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 p-1 flex items-center justify-center shrink-0">
                {selectedCatalogProduct.image ? (
                  <img src={selectedCatalogProduct.image} alt="" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-neutral-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-900 line-clamp-1">{selectedCatalogProduct.name}</p>
                <p className="text-[11px] text-neutral-500">Current Lowest: {formatINR(selectedCatalogProduct.lowest_offer_price)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitOffer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Your Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="999"
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Your List Price / MRP (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={offerMrp}
                    onChange={(e) => setOfferMrp(e.target.value)}
                    placeholder="1499"
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Stock Units <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={offerStock}
                    onChange={(e) => setOfferStock(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-neutral-700">Transit Days</label>
                    {warehousePincode && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                        WH {warehousePincode}
                      </span>
                    )}
                  </div>
                  <select
                    value={offerDeliveryDays}
                    onChange={(e) => setOfferDeliveryDays(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="2">2 Days (Express Metro)</option>
                    <option value="3">3 Days (Standard Regional)</option>
                    <option value="5">5 Days (National / Extended)</option>
                    <option value="7">7 Days (Heavy / Bulk)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Auto-selected {estimatedTransitDays} Days from registered warehouse {warehousePincode ? `(${warehousePincode})` : ""}.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">Your SKU / Item Code (Optional)</label>
                <input
                  type="text"
                  value={offerSku}
                  onChange={(e) => setOfferSku(e.target.value)}
                  placeholder="e.g. WH-BLACK-01"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCatalogProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOffer}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {submittingOffer ? "Publishing Offer..." : "Publish to My Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODE 2: CREATE NEW MASTER PRODUCT (WITH AI & ANTISLOP)                */}
      {/* --------------------------------------------------------------------- */}
      {mode === "CREATE_NEW" && (
        <form onSubmit={handleCreateNewProduct} className="space-y-6">
          {/* Card 1: Core Details & AI Autofill */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Product Title & Brand</h2>
                <p className="text-xs text-neutral-500">Provide the brand name and base product title.</p>
              </div>

              {/* Agentic AI Autofill Button */}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Apple, Sony, boAt"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Product Title (Proper Title Case) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setName(toTitleCase(name))}
                  placeholder="e.g. Sony WH-1000XM5 Wireless Headphones (Midnight Black)"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <p className="mt-1 text-[11px] text-neutral-400">
                  Standard convention: [Brand] + [Model] + ([Key Specs/Color/Capacity]).
                </p>
              </div>
            </div>

            {/* Cascading Category Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Main Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestIsSubcategory(false);
                      setShowSuggestModal(true);
                    }}
                    className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <FolderPlus className="w-3 h-3" /> + Suggest New
                  </button>
                </div>
                <select
                  required
                  value={selectedMainCatId}
                  onChange={(e) => {
                    setSelectedMainCatId(e.target.value);
                    setSelectedSubCatId("");
                  }}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Subcategory (Opens automatically)
                  </label>
                  {selectedMainCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSuggestIsSubcategory(true);
                        setShowSuggestModal(true);
                      }}
                      className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <FolderPlus className="w-3 h-3" /> + Suggest Subcategory
                    </button>
                  )}
                </div>
                <select
                  value={selectedSubCatId}
                  onChange={(e) => setSelectedSubCatId(e.target.value)}
                  disabled={!selectedMainCatId || availableSubcategories.length === 0}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-400"
                >
                  <option value="">
                    {selectedMainCatId
                      ? availableSubcategories.length > 0
                        ? "-- Choose Subcategory --"
                        : "-- No subcategories available --"
                      : "-- First select Main Category --"}
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

          {/* Card 2: Pricing & Inventory */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              Pricing & Stock Units
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="999"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">List Price / MRP (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="1499"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Stock Units <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="25"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">SKU Code</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SONY-XM5-BLK"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Working Image URLs & Gallery */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-neutral-500" />
                Product Images & Live Previews
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Add image URLs. The first image will be used as the primary catalog thumbnail.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/... or public image URL"
                className="flex-1 rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
              >
                + Add Image
              </button>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-neutral-200 bg-neutral-50 p-2 overflow-hidden flex flex-col items-center"
                  >
                    <div className="w-full h-28 flex items-center justify-center overflow-hidden rounded-lg bg-white">
                      <img
                        src={imgUrl}
                        alt={`Product ${idx}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/400x400?text=Invalid+Image+URL";
                        }}
                      />
                    </div>
                    <div className="mt-2 w-full flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-neutral-500">
                        {idx === 0 ? "★ Primary" : `#${idx + 1}`}
                      </span>
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
            ) : (
              <p className="text-xs text-neutral-400 italic">No images added yet. At least one image is recommended.</p>
            )}
          </div>

          {/* Card 4: Description & Warranty & Return Policy */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              Description, Warranty & Return Policy
            </h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Product Description (Supports HTML for rich storefront display)
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Highlight key features, benefits, in-the-box contents, and usage details..."
                className="mt-1.5 w-full rounded-xl border border-neutral-200 p-3 text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Warranty Information <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={warrantyInfo}
                  onChange={(e) => setWarrantyInfo(e.target.value)}
                  placeholder="e.g. 1 Year Manufacturer Domestic Warranty"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Return / Replacement Policy <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={returnPolicy}
                  onChange={(e) => setReturnPolicy(e.target.value)}
                  placeholder="e.g. 7 Days Replacement Only"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Specifications Key-Value Rows */}
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

              {specs.map((spec, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={spec.name}
                    onChange={(e) => handleSpecChange(idx, "name", e.target.value)}
                    placeholder="Attribute (e.g. Color)"
                    className="w-1/3 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                    placeholder="Value (e.g. Midnight Black)"
                    className="flex-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  {specs.length > 1 && (
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

          {/* Form Actions */}
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
              disabled={submittingProduct}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
            >
              {submittingProduct ? "Publishing Listing..." : "Create & Publish Product"}
            </button>
          </div>
        </form>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: SUGGEST NEW CATEGORY / SUBCATEGORY                             */}
      {/* --------------------------------------------------------------------- */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {suggestIsSubcategory ? "Suggest Subcategory" : "Suggest Main Category"}
                </h3>
                <p className="text-xs text-neutral-500">Submitted for immediate Admin approval.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuggestModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSuggestCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Category Name</label>
                <input
                  type="text"
                  required
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="e.g. Wireless Audio"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suggesting}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50"
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
