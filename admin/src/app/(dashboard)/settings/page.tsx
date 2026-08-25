"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Save, Loader2, RefreshCw, AlertCircle, Shield, Globe, Truck, Banknote, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR, rupeesToPaise, paiseToRupeeInput } from "@/lib/money";
import { BRAND_CONFIG } from "@/config/branding";

interface BusinessSettings {
  id: string;
  business_id: string;
  config: {
    currency?: string;
    theme?: { primaryColor?: string };
    branding?: { companyName?: string };
  };
}

interface StoreBanner {
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  link?: string | null;
  active?: boolean;
}

interface StoreSettings {
  cod_enabled: boolean;
  cod_fee_paise: number;
  cod_max_order_paise: number;
  free_shipping_threshold_paise: number;
  flat_shipping_paise: number;
  banner: StoreBanner | null;
  announcement: string | null;
  hero_slides?: any[];
  promo_tiles?: any[];
}

const inputClass =
  "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

function RupeeField({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const paise = rupeesToPaise(value);
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
        <input
          className={`${inputClass} pl-8`}
          type="number"
          min="0"
          step="0.01"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        {hint || (paise != null ? `${formatINR(paise)} · ${paise} paise` : "0 — stored as 0 paise")}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  // Business settings (existing)
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("INR");
  const [companyName, setCompanyName] = useState(BRAND_CONFIG.company.name);
  const [primaryColor, setPrimaryColor] = useState("#f59e0b");

  // Store commerce settings (new)
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [codEnabled, setCodEnabled] = useState(false);
  const [codFee, setCodFee] = useState("");
  const [codMaxOrder, setCodMaxOrder] = useState("");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [flatShipping, setFlatShipping] = useState("");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [promoTiles, setPromoTiles] = useState<any[]>([]);

  const loadBusiness = useCallback(async () => {
    try {
      setBusinessLoading(true);
      setBusinessError(null);
      const data = await apiClient.get<BusinessSettings>("/settings");
      if (data) {
        setBusinessSettings(data);
        if (data.config?.currency) setCurrency(data.config.currency);
        if (data.config?.branding?.companyName) setCompanyName(data.config.branding.companyName);
        if (data.config?.theme?.primaryColor) setPrimaryColor(data.config.theme.primaryColor);
      }
    } catch (err) {
      setBusinessError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Could not load business settings");
    } finally {
      setBusinessLoading(false);
    }
  }, []);

  const loadStore = useCallback(async () => {
    try {
      setStoreLoading(true);
      setStoreError(null);
      const data = await apiClient.get<StoreSettings>("/admin/store-settings");
      setStore(data);
      setCodEnabled(!!data.cod_enabled);
      setCodFee(paiseToRupeeInput(data.cod_fee_paise));
      setCodMaxOrder(paiseToRupeeInput(data.cod_max_order_paise));
      setFreeShippingThreshold(paiseToRupeeInput(data.free_shipping_threshold_paise));
      setFlatShipping(paiseToRupeeInput(data.flat_shipping_paise));
      setBannerTitle(data.banner?.title || "");
      setBannerSubtitle(data.banner?.subtitle || "");
      setBannerImage(data.banner?.image_url || "");
      setBannerLink(data.banner?.link || "");
      setBannerActive(!!data.banner?.active);
      setAnnouncement(data.announcement || "");
      setHeroSlides(data.hero_slides || []);
      setPromoTiles(data.promo_tiles || []);
    } catch (err) {
      setStoreError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Could not load store settings");
    } finally {
      setStoreLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBusiness();
    loadStore();
  }, [loadBusiness, loadStore]);

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSaving(true);
    try {
      const updatedConfig = {
        ...(businessSettings?.config || {}),
        currency,
        theme: { ...(businessSettings?.config?.theme || {}), primaryColor },
        branding: { ...(businessSettings?.config?.branding || {}), companyName },
      };
      const data = await apiClient.put<BusinessSettings>("/settings", { config: updatedConfig });
      setBusinessSettings(data);
      toast.success("Business settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save business settings");
    } finally {
      setBusinessSaving(false);
    }
  };

  const saveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSaving(true);
    try {
      const payload: Record<string, unknown> = {
        cod_enabled: codEnabled,
        cod_fee_paise: rupeesToPaise(codFee) ?? 0,
        cod_max_order_paise: rupeesToPaise(codMaxOrder) ?? 0,
        free_shipping_threshold_paise: rupeesToPaise(freeShippingThreshold) ?? 0,
        flat_shipping_paise: rupeesToPaise(flatShipping) ?? 0,
        banner_title: bannerTitle.trim() || null,
        banner_subtitle: bannerSubtitle.trim() || null,
        banner_image_url: bannerImage.trim() || null,
        banner_link: bannerLink.trim() || null,
        banner_active: bannerActive,
        announcement: announcement.trim() || null,
        hero_slides: heroSlides,
        promo_tiles: promoTiles,
      };
      const data = await apiClient.put<StoreSettings>("/admin/store-settings", payload);
      setStore(data);
      toast.success("Store commerce settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to save store settings");
    } finally {
      setStoreSaving(false);
    }
  };

  
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

  const reloadAll = () => {
    loadBusiness();
    loadStore();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-amber-500" />
            Settings
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Business profile and storefront commerce configuration.</p>
        </div>
        <button
          onClick={reloadAll}
          disabled={businessLoading || storeLoading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${businessLoading || storeLoading ? "animate-spin" : ""}`} />
          Reload
        </button>
      </div>

      {(businessError || storeError) && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            {businessError && <p>{businessError}</p>}
            {storeError && <p>{storeError}</p>}
          </div>
        </div>
      )}

      {/* Store commerce settings (new) */}
      <form onSubmit={saveStore} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        {storeLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-6 w-1/3 rounded-md bg-neutral-100" />
            <div className="h-12 w-full rounded-xl bg-neutral-100" />
            <div className="h-12 w-full rounded-xl bg-neutral-100" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-neutral-900">Store Commerce</h2>
            </div>
            <p className="-mt-3 text-xs text-neutral-400">
              Cash on delivery and shipping rules applied at checkout. All ₹ inputs are stored as integer paise.
            </p>

            {/* COD */}
            <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <Banknote className="h-4 w-4 text-amber-500" /> Enable Cash on Delivery
                </span>
                <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="h-5 w-5 accent-amber-500" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <RupeeField label="COD fee" value={codFee} onChange={setCodFee} placeholder="0" />
                <RupeeField label="COD max order value" value={codMaxOrder} onChange={setCodMaxOrder} placeholder="e.g. 10000" hint="Orders above this must pay online." />
              </div>
            </div>

            {/* Shipping */}
            <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700">
                <Truck className="h-4 w-4 text-amber-500" /> Shipping
              </span>
              <div className="grid gap-4 sm:grid-cols-2">
                <RupeeField label="Flat shipping fee" value={flatShipping} onChange={setFlatShipping} placeholder="e.g. 49" />
                <RupeeField
                  label="Free shipping threshold"
                  value={freeShippingThreshold}
                  onChange={setFreeShippingThreshold}
                  placeholder="e.g. 999"
                  hint="Orders at or above this subtotal ship free (0 disables)."
                />
              </div>
            </div>

            {/* Festival banner */}
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <Megaphone className="h-4 w-4 text-amber-500" /> Festival Banner
                </span>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-600">
                  Active
                  <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Title</label>
                  <input className={inputClass} value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} placeholder="e.g. Diwali Dhamaka" />
                </div>
                <div>
                  <label className={labelClass}>Subtitle</label>
                  <input className={inputClass} value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} placeholder="e.g. Up to 40% off" />
                </div>
                <div>
                  <label className={labelClass}>Image URL</label>
                  <input className={inputClass} value={bannerImage} onChange={(e) => setBannerImage(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className={labelClass}>Link</label>
                  <input className={inputClass} value={bannerLink} onChange={(e) => setBannerLink(e.target.value)} placeholder="/shop or https://..." />
                </div>
              </div>
              {bannerImage && (
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bannerImage} alt="Banner preview" className="h-24 w-full object-contain" />
                </div>
              )}
            </div>

            {/* Announcement */}
            <div>
              <label className={labelClass}>Announcement bar text</label>
              <input
                className={inputClass}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. Free shipping on orders above ₹999"
              />
              <p className="mt-1 text-xs text-neutral-400">Shown as a slim bar on the storefront. Empty clears it.</p>
            </div>

            
            
            {/* Hero Slides CRUD */}
            <div className="pt-4 border-t border-neutral-100">
              <h3 className="text-lg font-semibold mb-4">Home Page Sliding Banners</h3>
              {heroSlides.map((slide, idx) => (
                <div key={idx} className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Banner {idx + 1}</span>
                    <button type="button" onClick={() => setHeroSlides(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Delete</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className={inputClass} value={slide.eyebrow || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].eyebrow = e.target.value; return n; })} placeholder="Eyebrow text" />
                    <input className={inputClass} value={slide.title || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].title = e.target.value; return n; })} placeholder="Title text" />
                    <input className={inputClass} value={slide.subtitle || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].subtitle = e.target.value; return n; })} placeholder="Subtitle text" />
                    <input className={inputClass} value={slide.cta || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].cta = e.target.value; return n; })} placeholder="Button text" />
                    <input className={inputClass} value={slide.link || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].link = e.target.value; return n; })} placeholder="Button link URL" />
                    
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

                    <input className={inputClass} value={slide.bg || ''} onChange={(e) => setHeroSlides(prev => { const n = [...prev]; n[idx].bg = e.target.value; return n; })} placeholder="Background CSS (e.g. bg-blue-100)" />
                  </div>
                  {slide.img && <img src={slide.img} className="w-full h-32 object-cover rounded-xl mt-2" />}
                </div>
              ))}
              <button type="button" onClick={() => setHeroSlides(prev => [...prev, { id: Date.now() }])} className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                + Add Banner
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={storeSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
              >
                {storeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {storeSaving ? "Saving..." : "Save Store Settings"}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Business settings (existing) */}
      <form onSubmit={saveBusiness} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        {businessLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-6 w-1/3 rounded-md bg-neutral-100" />
            <div className="h-12 w-full rounded-xl bg-neutral-100" />
            <div className="h-12 w-full rounded-xl bg-neutral-100" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-neutral-900">Business Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Company / Store Name</label>
                <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-neutral-900">Financial Configuration</h3>
              </div>
              <div>
                <label className={labelClass}>Default Store Currency</label>
                <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                </select>
                <p className="mt-1 text-xs text-neutral-400">
                  All monetary values are calculated in integer minor units (paise / cents).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-900">Theme Accent Color</h3>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
                />
                <span className="font-mono text-sm text-neutral-500">{primaryColor}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={businessSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
              >
                {businessSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {businessSaving ? "Saving..." : "Save Business Settings"}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Change Password Section */}
      <ChangePassword />
    </div>
  );
}

function ChangePassword() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await apiClient.post("/auth/change-password", { current_password: currentPw, new_password: newPw });
      toast.success("Password changed successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-neutral-900">Change Password</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Current Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required minLength={8} />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </section>
    </form>
  );
}

