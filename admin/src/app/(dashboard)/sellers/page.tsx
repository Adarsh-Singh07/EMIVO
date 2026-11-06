"use client";

import { useState, useEffect } from "react";
import { Store, Plus, RefreshCw, Star, CheckCircle2, AlertCircle, Phone, Mail, MapPin, Package, ShoppingBag, ShieldAlert } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface SellerItem {
  id: string;
  name: string;
  business_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  pincode?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  rating: number;
  rating_count: number;
  commission_rate: number;
  product_count: number;
  order_item_count: number;
  created_at?: string;
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // New Seller Form
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstin, setGstin] = useState("");

  const loadSellers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<SellerItem[]>("/admin/sellers");
      setSellers(data || []);
    } catch {
      toast.error("Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !email.trim()) {
      toast.error("Business name and email are required");
      return;
    }

    try {
      setCreating(true);
      await apiClient.post("/admin/sellers", {
        business_name: businessName.trim(),
        name: contactName.trim() || businessName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        gstin: gstin.trim() || null,
      });

      toast.success(`Seller "${businessName}" provisioned! Seller can now log in via Email OTP.`);
      setModalOpen(false);
      setBusinessName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setCity("");
      setPincode("");
      setGstin("");
      loadSellers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create seller");
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (sellerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setBusyId(sellerId);
    try {
      await apiClient.put(`/admin/sellers/${sellerId}/status`, { status: nextStatus });
      toast.success(`Seller status updated to ${nextStatus}`);
      setSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, status: nextStatus as any } : s))
      );
    } catch {
      toast.error("Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <Store className="w-8 h-8 text-amber-500" />
            Marketplace Sellers
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage authorized marketplace sellers, provision seller credentials, and inspect inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSellers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Seller Account
          </button>
        </div>
      </div>

      {/* Sellers List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : sellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-neutral-200 text-center">
          <Store className="w-12 h-12 text-neutral-400 mb-3" />
          <h3 className="text-lg font-bold text-neutral-900">No Sellers Found</h3>
          <p className="text-sm text-neutral-500 max-w-sm mt-1">
            Create your first marketplace seller account to begin onboarding vendors.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sellers.map((seller) => {
            const isApna = seller.business_name === "Apna Enterprises";
            return (
              <div
                key={seller.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-neutral-900 leading-tight">
                          {seller.business_name}
                        </h3>
                        {isApna && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            In-House / Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">Contact: {seller.name}</p>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                        seller.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {seller.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-neutral-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="font-mono text-neutral-800">{seller.email}</span>
                    </div>
                    {seller.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{seller.phone}</span>
                      </div>
                    )}
                    {seller.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{seller.city}{seller.pincode ? ` (${seller.pincode})` : ""}</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                    <div>
                      <div className="text-xs text-neutral-500 font-medium flex items-center justify-center gap-1">
                        <Package className="w-3 h-3 text-neutral-400" /> Products
                      </div>
                      <div className="text-base font-bold text-neutral-900 mt-0.5">
                        {seller.product_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 font-medium flex items-center justify-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-neutral-400" /> Orders
                      </div>
                      <div className="text-base font-bold text-neutral-900 mt-0.5">
                        {seller.order_item_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 font-medium flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Rating
                      </div>
                      <div className="text-base font-bold text-neutral-900 mt-0.5">
                        {seller.rating.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">
                    ID: <code className="text-[11px] text-neutral-600">{seller.id.slice(0, 8)}...</code>
                  </span>
                  {!isApna && (
                    <button
                      onClick={() => toggleStatus(seller.id, seller.status)}
                      disabled={busyId === seller.id}
                      className={`font-semibold hover:underline ${
                        seller.status === "ACTIVE" ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {seller.status === "ACTIVE" ? "Suspend Seller" : "Activate Seller"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Seller Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
              <h3 className="text-xl font-bold tracking-tight text-neutral-900">
                Provision New Seller Account
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Marketplace registration is invite-only. Sellers sign in using their registered email via Email OTP.
              </p>
            </div>

            <form onSubmit={handleCreateSeller} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Business / Store Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Retail India"
                  className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@business.com"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    City / Hub
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="560001"
                    maxLength={6}
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Seller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
