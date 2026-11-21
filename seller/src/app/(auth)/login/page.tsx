"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";
import { apiClient, ApiError, authStorage } from "@/lib/api-client";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { toast } from "sonner";

export default function SellerLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"PASSWORD" | "OTP">("PASSWORD");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"EMAIL" | "CODE">("EMAIL");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password Submit
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid merchant email address");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
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
      }>("/seller/auth/login", {
        email: email.trim().toLowerCase(),
        password: password,
      });

      authStorage.setToken(res.access_token);
      authStorage.setSeller(res.seller);
      toast.success(`Welcome back, ${res.seller.business_name}!`);
      router.push("/");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid email or password";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP Request
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
      setOtpStep("CODE");
      toast.success(res.message || "Verification code sent to your email!");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to send verification code";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error("Please enter the 6-digit verification code");
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
        code: otpCode.trim(),
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
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-neutral-100 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          <BrandLogo size={44} subtitle="SELLER CENTRAL" className="mb-3" />
          <p className="text-xs text-neutral-400">
            Marketplace Merchant Portal & Fulfillment Management
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="mt-8 flex rounded-xl bg-neutral-900 p-1 border border-neutral-800">
          <button
            type="button"
            onClick={() => { setTab("PASSWORD"); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === "PASSWORD"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Password Sign-In
          </button>
          <button
            type="button"
            onClick={() => { setTab("OTP"); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === "OTP"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Email OTP Sign-In
          </button>
        </div>

        {/* Form Card */}
        <div className="mt-4 bg-neutral-900 border border-neutral-800 py-8 px-6 shadow-xl rounded-2xl sm:px-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === "PASSWORD" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Business Email
                </label>
                <div className="mt-1.5 relative rounded-xl">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="merchant@elektrix.in"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Password
                </label>
                <div className="mt-1.5 relative rounded-xl">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-400">
                  Apana Enterprises / Admin can use the production admin password.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Sign In to Seller Central"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div>
              {otpStep === "EMAIL" ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                      Registered Merchant Email
                    </label>
                    <div className="mt-1.5 relative rounded-xl">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="merchant@elektrix.in"
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Sending One-Time Passcode..." : "Send Verification Code"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpStep("EMAIL")}
                        className="text-xs text-amber-500 hover:underline"
                      >
                        Change Email
                      </button>
                    </div>
                    <div className="mt-1.5 relative rounded-xl">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-center text-lg tracking-widest font-mono text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Enter the single-use code sent to {email}.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify & Enter Portal"}
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
