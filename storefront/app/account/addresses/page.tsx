"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Trash2, CheckCircle2, ChevronRight, LogIn, ShieldAlert, Loader2, Navigation } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type Address } from "@/lib/store-api";
import { toast } from "sonner";

const EMPTY = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  label: "",
};

export default function AddressesPage() {
  const { user, loading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [locationHint, setLocationHint] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const data = await storeApi.listAddresses();
      setAddresses(data.items || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load addresses");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
    else setFetching(false);
  }, [user, load]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const resetForm = () => {
    setForm({ ...EMPTY });
    setLocationHint("");
    setIsAdding(false);
  };

  const handlePincodeChange = async (val: string) => {
    const pin = val.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: pin }));
    if (pin.length === 6) {
      setPincodeLoading(true);
      try {
        const est = await storeApi.getShippingEstimate(pin);
        if (est.city || est.state) {
          setForm((f) => ({
            ...f,
            city: f.city || est.city || "",
            state: f.state || est.state || "",
          }));
          const place = est.city ? `${est.city}, ${est.state || ""}` : (est.state || "");
          const del = est.formatted_delivery_date ? ` • Delivery by ${est.formatted_delivery_date}` : "";
          setLocationHint(`📍 ${place}${del}`);
        }
      } catch {
        // ignore
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setLocationHint("");
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const geo = await storeApi.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (geo.success && geo.pincode) {
            setForm((f) => ({
              ...f,
              pincode: geo.pincode || f.pincode,
              city: geo.city || f.city,
              state: geo.state || f.state,
            }));
            const place = geo.city ? `${geo.city}, ` : "";
            toast.success(`Location detected: ${place}${geo.pincode}`);
            if (geo.estimate?.formatted_delivery_date) {
              setLocationHint(`📍 ${place}${geo.state} • Delivery by ${geo.estimate.formatted_delivery_date}`);
            }
          } else {
            toast.error(geo.message || "Could not detect PIN code from current coordinates");
          }
        } catch {
          toast.error("Failed to reverse geocode location");
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) {
          toast.error("Location permission denied. Please enter PIN code manually.");
        } else {
          toast.error("Could not fetch location. Please enter PIN code manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.line1.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      toast.error("Pincode must be exactly 6 digits");
      return;
    }

    setIsSaving(true);
    try {
      await storeApi.createAddress({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        country: "IN",
        label: form.label.trim() || undefined,
        is_default: addresses.length === 0,
      });
      toast.success("Address added successfully");
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await storeApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Address deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await storeApi.setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
      toast.success("Default address set successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set default");
    }
  };

  if (loading || (user && fetching)) {
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
          href="/login?next=/account/addresses"
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">New Address</h2>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50 transition-colors"
            >
              {detectingLocation ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Detecting location…</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Use Current Location</span>
                </>
              )}
            </button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Receiver Name *
              </label>
              <input value={form.full_name} onChange={update("full_name")} placeholder="Rahul Sharma" className={inputCls} required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Phone Number *
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                placeholder="9876543210"
                inputMode="numeric"
                className={inputCls}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Street / Area *
              </label>
              <input value={form.line1} onChange={update("line1")} placeholder="Flat/House no., Street, Area" className={inputCls} required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Landmark (Optional)
              </label>
              <input value={form.line2} onChange={update("line2")} placeholder="Near Metro Station" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                City *
              </label>
              <input value={form.city} onChange={update("city")} placeholder="Mumbai" className={inputCls} required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                State *
              </label>
              <input value={form.state} onChange={update("state")} placeholder="Maharashtra" className={inputCls} required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">
                  PIN code *
                </label>
                {pincodeLoading && (
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking place…
                  </span>
                )}
              </div>
              <input
                value={form.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                placeholder="400001"
                inputMode="numeric"
                maxLength={6}
                className={inputCls}
                required
              />
              {locationHint && (
                <p className="text-xs text-emerald-700 font-medium mt-1.5">
                  {locationHint}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Label (Optional)
              </label>
              <input value={form.label} onChange={update("label")} placeholder="Home, Work…" className={inputCls} />
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
                className="h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Address
              </button>
            </div>
          </form>
        </div>
      ) : addresses.length === 0 ? (
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
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`border rounded-3xl p-6 bg-white transition-all ${
                addr.is_default ? "border-neutral-950 ring-1 ring-neutral-950" : "border-neutral-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-lg">{addr.full_name}</p>
                    {addr.label && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                        {addr.label}
                      </span>
                    )}
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} —{" "}
                    <span className="font-medium text-neutral-900">{addr.pincode}</span>
                  </p>
                  <p className="text-sm text-neutral-500">
                    Phone: <span className="font-medium text-neutral-800">{addr.phone}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="w-9 h-9 rounded-full grid place-items-center hover:bg-red-50 border border-neutral-100 text-neutral-600 hover:text-red-600 transition-colors"
                    title="Delete address"
                    aria-label={`Delete address for ${addr.full_name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!addr.is_default && (
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
