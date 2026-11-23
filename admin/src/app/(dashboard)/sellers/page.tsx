"use client";

import { useState, useEffect } from "react";
import { 
  Store, 
  Plus, 
  RefreshCw, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  ShoppingBag, 
  ShieldCheck,
  Trash2,
  Archive,
  KeyRound,
  Copy,
  Check,
  X,
  ExternalLink,
  Edit3,
  AlertTriangle
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface SellerItem {
  id: string;
  name: string;
  business_name: string;
  contact_person?: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  address_line2?: string | null;
  gstin?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED" | "PENDING";
  rating: number;
  rating_count: number;
  commission_rate: number;
  product_count: number;
  order_item_count: number;
  created_at?: string;
}

interface NewSellerCredentials {
  business_name: string;
  contact_person: string;
  email: string;
  password: string;
  login_url: string;
  must_change_password: boolean;
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING" | "SUSPENDED">("ALL");
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Selected Seller for Detail Card Modal
  const [selectedSeller, setSelectedSeller] = useState<SellerItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<SellerItem>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Approve Pending Seller
  const handleApproveSeller = async (seller: SellerItem) => {
    setBusyId(seller.id);
    try {
      const res = await apiClient.post<any>(`/admin/sellers/${seller.id}/approve`, {
        commission_rate: Number(seller.commission_rate) || 0,
      });

      toast.success(res.message || `Seller ${seller.business_name} approved!`);
      if (res.generated_password) {
        setCreatedCredentials({
          business_name: res.business_name || seller.business_name,
          contact_person: seller.contact_person || seller.name,
          email: res.email || seller.email,
          password: res.generated_password,
          login_url: res.login_url || "https://sell.elektrix.in/login",
          must_change_password: true,
        });
      }
      loadSellers();
      if (selectedSeller && selectedSeller.id === seller.id) {
        setSelectedSeller((prev) => (prev ? { ...prev, status: "ACTIVE" } : null));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve seller");
    } finally {
      setBusyId(null);
    }
  };

  // New Seller Form State
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [commissionRate, setCommissionRate] = useState("0");

  // Post-Creation Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<NewSellerCredentials | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const filteredSellers = sellers.filter((s) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING") return s.status === "PENDING" || s.status === "PENDING_APPROVAL";
    if (statusFilter === "ACTIVE") return s.status === "ACTIVE";
    if (statusFilter === "SUSPENDED") return s.status === "SUSPENDED" || s.status === "ARCHIVED";
    return true;
  });

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

  // Open Detail Modal
  const handleOpenSellerCard = (seller: SellerItem) => {
    setSelectedSeller(seller);
    setEditForm({
      name: seller.contact_person || seller.name,
      contact_person: seller.contact_person || seller.name,
      business_name: seller.business_name,
      phone: seller.phone || "",
      city: seller.city || "",
      state: seller.state || "",
      pincode: seller.pincode || "",
      address: seller.address || "",
      address_line2: seller.address_line2 || "",
      gstin: seller.gstin || "",
      commission_rate: seller.commission_rate ?? 0,
      status: seller.status,
    });
  };

  // Save Seller Details
  const handleSaveSellerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller) return;

    setSavingEdit(true);
    try {
      const updated = await apiClient.put<SellerItem>(`/admin/sellers/${selectedSeller.id}`, {
        name: editForm.contact_person || editForm.name,
        contact_person: editForm.contact_person || editForm.name,
        business_name: editForm.business_name,
        phone: editForm.phone || null,
        city: editForm.city || null,
        state: editForm.state || null,
        pincode: editForm.pincode || null,
        address: editForm.address || null,
        address_line2: editForm.address_line2 || null,
        gstin: editForm.gstin || null,
        commission_rate: Number(editForm.commission_rate) || 0,
      });

      toast.success("Seller profile and contact information updated!");
      setSelectedSeller((prev) => (prev ? { ...prev, ...updated } : null));
      loadSellers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update seller");
    } finally {
      setSavingEdit(false);
    }
  };

  // Update Status (ACTIVE, SUSPENDED, ARCHIVED)
  const handleUpdateStatus = async (sellerId: string, nextStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED") => {
    setBusyId(sellerId);
    try {
      await apiClient.put(`/admin/sellers/${sellerId}/status`, { status: nextStatus });
      toast.success(`Seller status updated to ${nextStatus}`);
      setSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, status: nextStatus } : s))
      );
      if (selectedSeller && selectedSeller.id === sellerId) {
        setSelectedSeller((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  // Permanently Delete Seller
  const handleDeleteSeller = async (sellerId: string) => {
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/sellers/${sellerId}`);
      toast.success("Seller permanently deleted. Catalog products remain with stocks cleared to 0.");
      setConfirmDeleteId(null);
      setSelectedSeller(null);
      loadSellers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete seller");
    } finally {
      setDeleting(false);
    }
  };

  // Auto-generate strong initial password
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(`Elk@${pwd}`);
  };

  // Create New Seller
  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !email.trim()) {
      toast.error("Business name and email are required");
      return;
    }

    try {
      setCreating(true);
      const res = await apiClient.post<any>("/admin/sellers", {
        business_name: businessName.trim(),
        name: contactName.trim() || businessName.trim(),
        email: email.trim(),
        password: customPassword.trim() || undefined,
        must_change_password: mustChangePassword,
        phone: phone.trim() || null,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        address: address.trim() || null,
        gstin: gstin.trim() || null,
        commission_rate: Number(commissionRate) || 0,
      });

      // Show credentials modal
      setCreatedCredentials({
        business_name: res.business_name || businessName.trim(),
        contact_person: contactName.trim() || businessName.trim(),
        email: res.email || email.trim(),
        password: res.generated_password || customPassword,
        login_url: res.login_url || "https://sell.elektrix.in/login",
        must_change_password: res.must_change_password ?? true,
      });

      setCreateModalOpen(false);
      setBusinessName("");
      setContactName("");
      setEmail("");
      setCustomPassword("");
      setPhone("");
      setCity("");
      setStateName("");
      setPincode("");
      setAddress("");
      setGstin("");
      loadSellers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create seller");
    } finally {
      setCreating(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `ELEKTRIX Seller Account Credentials\nStore: ${createdCredentials.business_name}\nContact: ${createdCredentials.contact_person}\nLogin Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}\nLogin Portal: ${createdCredentials.login_url}\nNote: Password change required upon first sign in.`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2500);
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
            Manage marketplace sellers, edit contact person details, archive sellers, and provision secure credentials.
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
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Provision New Seller
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "ACTIVE", "PENDING", "SUSPENDED"] as const).map((tab) => {
          const count = sellers.filter((s) => {
            if (tab === "ALL") return true;
            if (tab === "PENDING") return s.status === "PENDING" || s.status === "PENDING_APPROVAL";
            if (tab === "ACTIVE") return s.status === "ACTIVE";
            if (tab === "SUSPENDED") return s.status === "SUSPENDED" || s.status === "ARCHIVED";
            return true;
          }).length;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                statusFilter === tab
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <span>
                {tab === "ALL"
                  ? "All Sellers"
                  : tab === "PENDING"
                  ? "Pending Approval"
                  : tab === "ACTIVE"
                  ? "Active"
                  : "Suspended"}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                  statusFilter === tab
                    ? "bg-neutral-800 text-neutral-300"
                    : tab === "PENDING" && count > 0
                    ? "bg-orange-100 text-orange-700 font-bold"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sellers Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-neutral-200 text-center">
          <Store className="w-12 h-12 text-neutral-400 mb-3" />
          <h3 className="text-lg font-bold text-neutral-900">No Sellers in this Category</h3>
          <p className="text-sm text-neutral-500 max-w-sm mt-1">
            {statusFilter === "PENDING"
              ? "There are currently no new seller registration applications awaiting review."
              : "No seller profiles match the current filter selection."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSellers.map((seller) => {
            const isApna = seller.business_name === "Apana Enterprises";
            const contactPerson = seller.contact_person || seller.name;
            const hasReviews = (seller.rating_count || 0) > 0 && seller.rating > 0;

            return (
              <div
                key={seller.id}
                onClick={() => handleOpenSellerCard(seller)}
                className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-sm flex flex-col justify-between hover:border-neutral-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-neutral-900 leading-tight group-hover:text-amber-600 transition-colors">
                          {seller.business_name}
                        </h3>
                        {isApna && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                            Master / Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                        <span className="font-medium text-neutral-700">Contact:</span> {contactPerson}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                        seller.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : seller.status === "PENDING" || seller.status === "PENDING_APPROVAL"
                          ? "bg-orange-100 text-orange-800 border border-orange-300 font-extrabold animate-pulse"
                          : seller.status === "ARCHIVED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {seller.status === "PENDING_APPROVAL" ? "PENDING REVIEW" : seller.status}
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
                        <Star className={`w-3 h-3 ${hasReviews ? "fill-amber-400 text-amber-400" : "text-neutral-400"}`} /> Rating
                      </div>
                      <div className="text-xs font-bold text-neutral-900 mt-1">
                        {hasReviews ? `${seller.rating.toFixed(1)} ★` : "New Seller"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div 
                  className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleOpenSellerCard(seller)}
                    className="text-neutral-600 hover:text-neutral-900 font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> View & Edit
                  </button>

                  {!isApna && (
                    <div className="flex items-center gap-2">
                      {seller.status === "PENDING" || seller.status === "PENDING_APPROVAL" ? (
                        <button
                          onClick={() => handleApproveSeller(seller)}
                          disabled={busyId === seller.id}
                          className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {busyId === seller.id ? "Approving..." : "Approve Seller"}
                        </button>
                      ) : seller.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleUpdateStatus(seller.id, "ARCHIVED")}
                          disabled={busyId === seller.id}
                          className="text-amber-700 hover:underline font-semibold"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(seller.id, "ACTIVE")}
                          disabled={busyId === seller.id}
                          className="text-green-700 hover:underline font-semibold"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SELLER DETAIL CARD MODAL (View, Edit Contact, Archive, Delete)         */}
      {/* --------------------------------------------------------------------- */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/70 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold tracking-tight text-neutral-900">
                    {selectedSeller.business_name}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                      selectedSeller.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : selectedSeller.status === "ARCHIVED"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedSeller.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Seller ID: <code className="font-mono text-neutral-700">{selectedSeller.id}</code>
                </p>
              </div>

              <button
                onClick={() => setSelectedSeller(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editable Profile Form */}
            <form onSubmit={handleSaveSellerEdit} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.contact_person || ""}
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.business_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                    placeholder="e.g. Apex Retail India"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Registered Login Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={selectedSeller.email}
                    className="w-full h-10 rounded-xl border border-neutral-200 bg-neutral-100 px-3.5 text-sm text-neutral-500 font-mono cursor-not-allowed"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Primary email used for Seller Central sign-in.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    City / Fulfillment Hub
                  </label>
                  <input
                    type="text"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g. Gopalganj"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={editForm.state || ""}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    placeholder="e.g. Bihar"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Warehouse Pincode
                  </label>
                  <input
                    type="text"
                    value={editForm.pincode || ""}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    placeholder="841428"
                    maxLength={6}
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Warehouse Physical Address
                </label>
                <input
                  type="text"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Street / Facility / Industrial Area"
                  className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    GSTIN (Tax Identifier)
                  </label>
                  <input
                    type="text"
                    value={editForm.gstin || ""}
                    onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
                    placeholder="10AAAAA0000A1Z5"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.commission_rate ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, commission_rate: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status & Deletion Controls */}
              {selectedSeller.business_name !== "Apana Enterprises" && (
                <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-medium">Lifecycle Status:</span>
                    {(selectedSeller.status === "PENDING" || selectedSeller.status === "PENDING_APPROVAL") && (
                      <button
                        type="button"
                        onClick={() => handleApproveSeller(selectedSeller)}
                        disabled={busyId === selectedSeller.id}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-sm flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {busyId === selectedSeller.id ? "Approving..." : "Approve & Send Welcome Email"}
                      </button>
                    )}
                    {selectedSeller.status !== "ACTIVE" && selectedSeller.status !== "PENDING" && selectedSeller.status !== "PENDING_APPROVAL" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedSeller.id, "ACTIVE")}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        Activate Seller
                      </button>
                    )}
                    {selectedSeller.status !== "ARCHIVED" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedSeller.id, "ARCHIVED")}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      >
                        Archive Seller
                      </button>
                    )}
                    {selectedSeller.status !== "SUSPENDED" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedSeller.id, "SUSPENDED")}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      >
                        Suspend Seller
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selectedSeller.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setSelectedSeller(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 shadow-sm"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* DELETE CONFIRMATION MODAL                                              */}
      {/* --------------------------------------------------------------------- */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900">Delete Seller Permanently?</h4>
                <p className="text-xs text-neutral-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to permanently delete this seller profile? Their products will remain preserved in the master catalog with <strong>stock set to 0 and deactivated</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDeleteSeller(confirmDeleteId)}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Permanent Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* PROVISION SELLER MODAL (With Custom/Auto-Generated Password)           */}
      {/* --------------------------------------------------------------------- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-neutral-900">
                  Provision New Seller Account
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set up store credentials. The seller can sign in using this password or Email OTP.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeller} className="p-6 overflow-y-auto space-y-4 flex-1">
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

              {/* Password Setup */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                    Initial Seller Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-medium"
                  >
                    + Auto-Generate Secure
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate password"
                    className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none font-mono"
                  />
                  <KeyRound className="absolute right-3 top-3 w-4 h-4 text-neutral-400" />
                </div>
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mustChangePassword}
                    onChange={(e) => setMustChangePassword(e.target.checked)}
                    className="rounded text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="text-xs text-neutral-600">Require password change upon first login</span>
                </label>
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
                    Warehouse Pincode
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Warehouse Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Facility address or industrial area"
                  className="w-full h-10 rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {creating ? "Provisioning..." : "Create Seller Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* CREDENTIALS ALERT MODAL (After Successful Seller Creation)             */}
      {/* --------------------------------------------------------------------- */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900">Seller Provisioned!</h4>
                <p className="text-xs text-neutral-500">Copy credentials to share with merchant.</p>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs font-mono">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-sans">Store Name</span>
                <span className="font-semibold text-neutral-900">{createdCredentials.business_name}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-sans">Login Email</span>
                <span className="text-neutral-900">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-sans">Temporary Password</span>
                <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {createdCredentials.password}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-sans">Portal URL</span>
                <span className="text-neutral-700">{createdCredentials.login_url}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              A welcome email has also been queued for this seller. Please copy these credentials for your records.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shadow-sm"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey ? "Copied!" : "Copy Credentials"}
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
