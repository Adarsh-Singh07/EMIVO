"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Mail, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Info, Sparkles } from "lucide-react";
import { apiClient, ApiError, authStorage } from "@/lib/api-client";
import { toast } from "sonner";

export default function SellerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid business email address");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ status: string; message: string; debug_code?: string }>(
        "/seller/auth/otp/request",
        { email: email.trim().toLowerCase() }
      );
      setStep("OTP");
      if (res.debug_code) {
        setDebugCode(res.debug_code);
      }
      toast.success(res.message || "Verification code sent to your email!");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to send verification code";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{
        access_token: string;
        seller: {
          id: string;
          name: string;
          business_name: string;
          email: string;
          city: string;
          status: string;
          rating: number;
        };
      }>("/seller/auth/otp/verify", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });

      authStorage.setToken(res.access_token);
      authStorage.setSeller(res.seller);
      toast.success(`Welcome back, ${res.seller.business_name}!`);
      router.push("/");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid or expired verification code";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20 mb-4">
            <Store className="w-9 h-9 text-slate-950" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Seller Central
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            ELEKTRIX Multi-Category E-Commerce Marketplace
          </p>
        </div>

        {/* Invitation Only Notice */}
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Admin Invitation Only</p>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">
              Public seller registration is disabled. Only pre-authorized merchant accounts provisioned by Elektrix Administration can log in using their verified email OTP.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="mt-6 bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {debugCode && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Dev Mode OTP Code:
              </span>
              <span className="font-mono font-bold tracking-widest text-emerald-200 text-sm">{debugCode}</span>
            </div>
          )}

          {step === "EMAIL" ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Registered Business Email
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@business.com or admin@elektrix.in"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Tip: For in-house catalog access, use <strong>admin@elektrix.in</strong> (Apna Enterprises).
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-amber-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-spin mr-2">⟳</span>
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="code" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    6-Digit One-Time Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setStep("EMAIL"); setCode(""); setError(null); }}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Change email
                  </button>
                </div>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono tracking-widest text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Code sent to <span className="text-white font-medium">{email}</span>. Valid for 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-amber-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-spin mr-2">⟳</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify & Enter Seller Central
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRequestOtp}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Didn&apos;t receive the code? Resend
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400">
              Need seller onboarding assistance?{" "}
              <a href="mailto:admin@elektrix.in" className="text-amber-400 hover:underline">
                Contact Elektrix Admin
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
