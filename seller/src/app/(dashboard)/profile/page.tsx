"use client";

import { useEffect, useState } from "react";
import { User, Store, Mail, Phone, MapPin, ShieldCheck, Star, FileText, Info } from "lucide-react";
import { apiClient, authStorage } from "@/lib/api-client";

interface SellerProfile {
  id: string;
  name: string;
  business_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  pincode?: string | null;
  status: string;
  rating: number;
  rating_count: number;
}

export default function SellerProfilePage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const data = await apiClient.get<SellerProfile>("/seller/me");
        setProfile(data);
        authStorage.setSeller(data as unknown as Record<string, unknown>);
      } catch {
        const cached = authStorage.getSeller();
        if (cached) setProfile(cached as SellerProfile);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg" />
        <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <User className="w-7 h-7 text-amber-500" />
          Seller Merchant Profile
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your verified merchant credentials and marketplace account status.
        </p>
      </div>

      {profile && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.business_name}</h2>
                <p className="text-xs text-slate-400">{profile.name} (Authorized Contact)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {profile.status}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {Number(profile.rating || 4.9).toFixed(1)} / 5.0
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Registered Email
              </span>
              <p className="mt-1 font-semibold text-slate-900">{profile.email}</p>
              <p className="text-[11px] text-slate-400">Used for OTP sign-in and order notifications.</p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Business Phone
              </span>
              <p className="mt-1 font-semibold text-slate-900">{profile.phone || "+91 —"}</p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Warehouse City & Pincode
              </span>
              <p className="mt-1 font-semibold text-slate-900">
                {profile.city || "India"} {profile.pincode ? `- ${profile.pincode}` : ""}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Seller ID
              </span>
              <p className="mt-1 font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-lg inline-block">
                {profile.id}
              </p>
            </div>
          </div>

          {/* Notice Card */}
          <div className="m-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start gap-3">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              To update your legal business name, GSTIN, registered bank account, or pickup warehouse address, please contact Elektrix Merchant Operations at <a href="mailto:admin@elektrix.in" className="text-amber-600 font-semibold hover:underline">admin@elektrix.in</a>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
