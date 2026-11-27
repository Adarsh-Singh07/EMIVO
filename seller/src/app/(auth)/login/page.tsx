"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Store, X, CheckCircle2 } from "lucide-react";
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
          "Application submitted. The Elektrix team will review your details and email your login credentials once approved."
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
      toast.error("Enter a valid merchant email address");
      return;
    }
    if (!password) {
      toast.error("Enter your password");
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
      toast.error("Enter a valid business email address");
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
      toast.error("Enter the 6-digit verification code");
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

  const primaryBtn =
    "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-3.5 text-sm font-medium text-white transition-colors hover:border-neutral-700 hover:bg-neutral-700 disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo size={36} subtitle="Seller central" />
          <p className="mt-2 text-sm text-neutral-600">Manage your catalog, stock and orders.</p>
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-6">
          {/* Sign-in method tabs */}
          <div className="mb-4 flex gap-4 border-b border-neutral-200">
            {(
              [
                ["PASSWORD", "Password"],
                ["OTP", "Email code"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setError(null);
                }}
                className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
                  tab === key
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {tab === "PASSWORD" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">Business email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="merchant@elektrix.in"
                  className="ex-input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ex-input pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className={primaryBtn}>
                {loading ? "Signing in…" : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </form>
          ) : (
            <div>
              {otpStep === "EMAIL" ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">
                      Registered merchant email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@elektrix.in"
                      className="ex-input"
                      autoComplete="email"
                    />
                  </div>

                  <button type="submit" disabled={loading} className={primaryBtn}>
                    {loading ? "Sending code…" : "Email me a code"}
                    {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-sm font-medium text-neutral-800">Verification code</label>
                      <button
                        type="button"
                        onClick={() => setOtpStep("EMAIL")}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        Change email
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="ex-input text-center font-mono text-base tracking-widest"
                      inputMode="numeric"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Single-use code sent to {email}.
                    </p>
                  </div>

                  <button type="submit" disabled={loading} className={primaryBtn}>
                    {loading ? "Verifying…" : "Verify and sign in"}
                    {!loading && <ShieldCheck className="h-4 w-4" aria-hidden />}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Apply to sell */}
          <div className="mt-5 border-t border-neutral-200 pt-4 text-center">
            <p className="text-sm text-neutral-600">Want to sell on Elektrix?</p>
            <button
              type="button"
              onClick={() => {
                setRegError(null);
                setRegSuccess(null);
                setShowRegisterModal(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
            >
              <Store className="h-4 w-4" aria-hidden />
              Apply to become a seller
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/40 p-4">
          <div className="relative mx-auto my-8 w-full max-w-xl rounded-md border border-neutral-200 bg-white p-6 shadow-lg">
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5">
              <h2 className="text-base font-semibold text-neutral-900">Sell on Elektrix</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Submit your business details. We verify each application and email your credentials.
              </p>
            </div>

            {regSuccess ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-700" aria-hidden />
                <h3 className="mt-2 text-sm font-semibold text-emerald-900">Application received</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-emerald-900/80">{regSuccess}</p>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="mt-4 inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {regError && (
                  <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">
                      Business / store name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Apex Electronics"
                      value={regData.business_name}
                      onChange={(e) => setRegData({ ...regData, business_name: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">
                      Contact person <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full name"
                      value={regData.name}
                      onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">
                      Registered email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="merchant@firm.com"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">
                      Mobile / WhatsApp <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit number"
                      value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">
                      City <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Patna"
                      value={regData.city}
                      onChange={(e) => setRegData({ ...regData, city: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">State</label>
                    <input
                      type="text"
                      placeholder="Bihar"
                      value={regData.state}
                      onChange={(e) => setRegData({ ...regData, state: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">
                      PIN code <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="6 digits"
                      maxLength={6}
                      value={regData.pincode}
                      onChange={(e) => setRegData({ ...regData, pincode: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">GSTIN (optional)</label>
                    <input
                      type="text"
                      placeholder="15-digit GSTIN"
                      value={regData.gstin}
                      onChange={(e) => setRegData({ ...regData, gstin: e.target.value.toUpperCase() })}
                      className="ex-input uppercase"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-800">Category / specialty</label>
                    <input
                      type="text"
                      placeholder="Audio, chargers"
                      value={regData.category}
                      onChange={(e) => setRegData({ ...regData, category: e.target.value })}
                      className="ex-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">Address</label>
                  <textarea
                    placeholder="Shop or warehouse address"
                    value={regData.address}
                    onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                    className="ex-input"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-3.5 text-sm font-medium text-white transition-colors hover:border-neutral-700 hover:bg-neutral-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  {regLoading ? "Submitting…" : "Submit application"}
                  {!regLoading && <ArrowRight className="h-4 w-4" aria-hidden />}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
