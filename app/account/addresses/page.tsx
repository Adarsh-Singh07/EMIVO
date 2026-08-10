"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, ChevronRight, LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface AddressItem {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export default function AddressesPage() {
  const { user, loading, refreshUser } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const savedAddresses: AddressItem[] = (user?.addresses || []) as AddressItem[];

  const resetForm = () => {
    setName("");
    setPhone("");
    setLine1("");
    setLine2("");
    setCity("");
    setState("");
    setPincode("");
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (addr: AddressItem) => {
    setEditingId(addr.id);
    setName(addr.name);
    setPhone(addr.phone);
    setLine1(addr.line1);
    setLine2(addr.line2 || "");
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !line1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    if (pincode.trim().length !== 6) {
      toast.error("Pincode must be exactly 6 digits");
      return;
    }

    setIsSaving(true);
    try {
      let updatedList: AddressItem[] = [];
      if (editingId) {
        // Edit existing
        updatedList = savedAddresses.map((addr) =>
          addr.id === editingId
            ? { ...addr, name, phone, line1, line2, city, state, pincode }
            : addr
        );
      } else {
        // Add new
        const newAddr: AddressItem = {
          id: `addr_${Date.now()}`,
          name,
          phone,
          line1,
          line2,
          city,
          state,
          pincode,
          isDefault: savedAddresses.length === 0, // Make default if it's the first
        };
        updatedList = [...savedAddresses, newAddr];
      }

      await apiClient.put("/users/me", { addresses: updatedList });
      await refreshUser();
      toast.success(editingId ? "Address updated successfully" : "Address added successfully");
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Are you sure you want to delete this address?");
    if (!confirm) return;

    try {
      const updatedList = savedAddresses.filter((addr) => addr.id !== id);
      // If we deleted the default, set first remaining as default
      if (savedAddresses.find((addr) => addr.id === id)?.isDefault && updatedList.length > 0) {
        updatedList[0].isDefault = true;
      }
      await apiClient.put("/users/me", { addresses: updatedList });
      await refreshUser();
      toast.success("Address deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const updatedList = savedAddresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }));
      await apiClient.put("/users/me", { addresses: updatedList });
      await refreshUser();
      toast.success("Default address set successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set default address");
    }
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-6 bg-neutral-100 rounded w-1/4 mx-auto mb-4" />
        <div className="h-32 bg-neutral-100 rounded-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-16 h-16 text-neutral-400 mx-auto mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Authentication Required</h1>
        <p className="text-neutral-500 mb-6">Please log in to manage your addresses.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
        >
          <LogIn className="w-4 h-4" /> Log In
        </Link>
      </div>
    );
  }

  const inputCls =
    "h-12 w-full border border-neutral-200 rounded-xl px-4 text-sm focus:outline-none focus:border-neutral-950";

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
        <Link href="/account" className="hover:text-neutral-900">
          My Account
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>Addresses</span>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">Saved Addresses</h1>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="h-10 px-4 inline-flex items-center gap-2 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="border border-neutral-200 rounded-3xl p-6 bg-neutral-50/30">
          <h2 className="font-semibold text-lg mb-6">{editingId ? "Edit Address" : "New Address"}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Receiver Name *
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" className={inputCls} required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Phone Number *
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                inputMode="tel"
                className={inputCls}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Street / Area *
              </label>
              <input
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Flat/House no., Street, Area"
                className={inputCls}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Landmark (Optional)
              </label>
              <input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Near Metro Station" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                City *
              </label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" className={inputCls} required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                State *
              </label>
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" className={inputCls} required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                PIN code *
              </label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="400001"
                inputMode="numeric"
                maxLength={6}
                className={inputCls}
                required
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="h-12 px-6 rounded-full border border-neutral-200 text-sm font-semibold hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Address"}
              </button>
            </div>
          </form>
        </div>
      ) : savedAddresses.length === 0 ? (
        <div className="border border-dashed border-neutral-200 rounded-3xl p-16 text-center text-neutral-400">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <p className="text-sm">No saved addresses found.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-4 h-10 px-6 inline-flex items-center gap-2 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {savedAddresses.map((addr) => (
            <div
              key={addr.id}
              className={`border rounded-3xl p-6 bg-white transition-all ${
                addr.isDefault ? "border-neutral-950 ring-1 ring-neutral-950" : "border-neutral-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-lg">{addr.name}</p>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} — <span className="font-medium text-neutral-900">{addr.pincode}</span>
                  </p>
                  <p className="text-sm text-neutral-500">
                    Phone: <span className="font-medium text-neutral-800">{addr.phone}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEdit(addr)}
                    className="w-9 h-9 rounded-full grid place-items-center hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
                    title="Edit address"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="w-9 h-9 rounded-full grid place-items-center hover:bg-red-50 border border-neutral-100 text-neutral-600 hover:text-red-600 transition-colors"
                    title="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!addr.isDefault && (
                <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end">
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    Set as default address
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
