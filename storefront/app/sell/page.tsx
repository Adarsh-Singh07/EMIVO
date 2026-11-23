"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Store,
  ShieldCheck,
  Truck,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { storeApi, SellerApplicationInput } from "@/lib/store-api";

export default function SellOnElektrixPage() {
  const [formData, setFormData] = useState<SellerApplicationInput>({
    business_name: "",
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    gstin: "",
    category: "",
    comments: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await storeApi.applySeller(formData);
      setSuccessMsg(
        res.message ||
          "Thank you for registering! Our admin team has been notified. You will receive your Seller Central login credentials via email once approved."
      );
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "Failed to submit your seller application. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Partner With ELEKTRIX
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Sell to Millions of Tech Buyers on{" "}
            <span className="text-orange-500">ELEKTRIX</span>
          </h1>
          <p className="text-lg text-neutral-400">
            Join India&apos;s verified electronics &amp; gadgets marketplace. Zero upfront listing fees,
            pan-India Delhivery integrated shipping, and guaranteed weekly settlements.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white">0% Upfront Listing Fee</h3>
            <p className="text-sm text-neutral-400">
              List unlimited products for free. Only pay a competitive commission when you make a sale.
            </p>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white">Delhivery Logistics</h3>
            <p className="text-sm text-neutral-400">
              Automated doorstep pickups from your warehouse or shop with real-time tracking across 19,000+ pin codes.
            </p>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white">Fast Weekly Payouts</h3>
            <p className="text-sm text-neutral-400">
              Direct bank transfers every week with transparent statements, GST reconciliation, and automated invoices.
            </p>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white">Open Box Protection</h3>
            <p className="text-sm text-neutral-400">
              Strict OTP verification upon delivery eliminates false return claims and protects genuine sellers.
            </p>
          </div>
        </div>

        {/* Application Form & Existing Account Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Card */}
          <div className="lg:col-span-8 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="border-b border-neutral-800 pb-5 mb-6">
              <h2 className="text-2xl font-bold text-white">Seller Registration Form</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Fill out your business details below. Our onboarding team reviews all applications and sends credentials
                to your email.
              </p>
            </div>

            {successMsg ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-emerald-300">Application Submitted!</h3>
                <p className="text-sm text-neutral-300 max-w-lg mx-auto leading-relaxed">
                  {successMsg}
                </p>
                <div className="pt-2">
                  <a
                    href="https://sell.elektrix.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Go to Seller Portal <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMsg && (
                  <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 text-red-300 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Business / Store Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Electronics &amp; Mobiles"
                      value={formData.business_name}
                      onChange={(e) =>
                        setFormData({ ...formData, business_name: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Contact Person Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Email Address <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rahul@business.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Credentials will be emailed to this address once approved.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Mobile / WhatsApp Number <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      City <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patna, Lucknow"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      State <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bihar, UP, Maharashtra"
                      value={formData.state || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      PIN Code <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="6-digit PIN"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({ ...formData, pincode: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="15-digit GST number if registered"
                      value={formData.gstin || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, gstin: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Product Categories / Specialization
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Smartphones, Audio, Power Accessories"
                      value={formData.category || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Warehouse / Business Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Shop/Unit number, Area, Landmark..."
                    value={formData.address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit Seller Application <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Already an Approved Seller?</h3>
              <p className="text-sm text-neutral-400">
                If your account is already active, you can sign in directly to manage your catalog, prices, and orders.
              </p>
              <a
                href="https://sell.elektrix.in/login"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors border border-neutral-700"
              >
                Login to Seller Portal <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
                <TrendingUp className="w-4 h-4" />
                How It Works
              </div>
              <ol className="space-y-3 text-xs text-neutral-300">
                <li className="flex gap-2.5">
                  <span className="font-bold text-orange-400">1.</span>
                  <span>Submit registration details via the form.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-orange-400">2.</span>
                  <span>Admin reviews your profile and approves your account.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-orange-400">3.</span>
                  <span>Receive login credentials in your welcome email.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-orange-400">4.</span>
                  <span>List products or attach offers to existing items.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-orange-400">5.</span>
                  <span>Pack orders, set status to &quot;Packed&quot;, and courier picks up from your doorstep!</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
