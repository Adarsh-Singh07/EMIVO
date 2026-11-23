"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, Store, X, CheckCircle2 } from "lucide-react";
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

  // Registration Form State ("Sell on Elektrix")
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regData, setRegData] = useState({
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
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);
    try {
      const res = await apiClient.post<{ id: string; status: string; message: string }>(
        "/sellers/apply",
        regData
      );
      setRegSuccess(
        res.message ||
          "Application submitted successfully! ELEKTRIX Administration will review your details and email your login credentials once approved."
      );
      toast.success("Seller application submitted!");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to submit application";
      setRegError(msg);
      toast.error(msg);
    } finally {
      setRegLoading(false);
    }
  };

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

          {/* Sell on Elektrix Interest Callout */}
          <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
            <p className="text-xs text-neutral-400 mb-2">
              Want to become an official merchant?
            </p>
            <button
              type="button"
              onClick={() => {
                setRegError(null);
                setRegSuccess(null);
                setShowRegisterModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all hover:scale-[1.02]"
            >
              <Store className="w-4 h-4" />
              Sell on Elektrix — Register Interest
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Store className="w-3.5 h-3.5" />
                Merchant Onboarding
              </div>
              <h2 className="text-xl font-bold text-white">Sell on ELEKTRIX</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Submit your business details. Admin will verify and send your credentials to your email.
              </p>
            </div>

            {regSuccess ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-emerald-300">Application Received</h3>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
                  {regSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="mt-3 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold"
                >
                  Close &amp; Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {regError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Business / Store Name <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Electronics"
                      value={regData.business_name}
                      onChange={(e) => setRegData({ ...regData, business_name: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Contact Person <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={regData.name}
                      onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Registered Email <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="merchant@firm.com"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Mobile / WhatsApp <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit number"
                      value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      City <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patna"
                      value={regData.city}
                      onChange={(e) => setRegData({ ...regData, city: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Bihar"
                      value={regData.state}
                      onChange={(e) => setRegData({ ...regData, state: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      PIN Code <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="6 digits"
                      maxLength={6}
                      value={regData.pincode}
                      onChange={(e) => setRegData({ ...regData, pincode: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="15-digit GSTIN"
                      value={regData.gstin}
                      onChange={(e) => setRegData({ ...regData, gstin: e.target.value.toUpperCase() })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Category / Specialty</label>
                    <input
                      type="text"
                      placeholder="e.g. Audio, Chargers"
                      value={regData.category}
                      onChange={(e) => setRegData({ ...regData, category: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {regLoading ? "Submitting Application..." : "Submit Seller Registration"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
