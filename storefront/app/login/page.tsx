"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, Smartphone, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type AuthMode = "password" | "otp";
type OtpStep = "identifier" | "code";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, requestOtp, verifyOtp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP flow state
  const [otpStep, setOtpStep] = useState<OtpStep>("identifier");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpChannel, setOtpChannel] = useState<"email" | "phone">("email");
  const [deliveredVia, setDeliveredVia] = useState<"email" | "sms">("email");
  const [otpCode, setOtpCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // v0.2 guards use ?next=…; the legacy ?callbackUrl=… keeps working.
  // Only same-origin relative paths are honoured — absolute URLs would turn
  // this page into an open redirect after login.
  const rawTarget = searchParams.get("next") || searchParams.get("callbackUrl") || "/";
  const callbackUrl = rawTarget.startsWith("/") && !rawTarget.startsWith("//") ? rawTarget : "/";

  useEffect(() => {
    if (resendIn <= 0) {
      if (resendTimer.current) clearInterval(resendTimer.current);
      return;
    }
    resendTimer.current = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => {
      if (resendTimer.current) clearInterval(resendTimer.current);
    };
  }, [resendIn > 0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }
    setIsLoading(true);
    try {
      await login({ email, password });
      toast.success("Welcome back!");
      router.push(callbackUrl);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (isResend = false) => {
    setError("");
    const id = otpChannel === "email" ? otpEmail.trim() : otpPhone.trim();
    if (!id) {
      setError(otpChannel === "email" ? "Enter your email address" : "Enter your mobile number");
      return;
    }
    if (otpChannel === "phone" && !/^(\+?91)?[6-9]\d{9}$/.test(id.replace(/[\s-]/g, ""))) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setIsLoading(true);
    try {
      const channel = await requestOtp(otpChannel === "email" ? { email: id } : { phone: id });
      setOtpStep("code");
      setDeliveredVia(channel);
      setResendIn(60);
      if (!isResend) setOtpCode("");
      if (otpChannel === "phone" && channel === "email") {
        toast.success(`SMS is unavailable right now — we emailed the code to your account's email address instead.`);
      } else {
        toast.success(
          otpChannel === "email"
            ? `Code sent to ${id}. It expires in 10 minutes.`
            : `Code sent to ${id}.`
        );
      }
    } catch (err: any) {
      setError(err?.message || "Could not send the code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Enter the 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      await verifyOtp(
        otpChannel === "email" ? { email: otpEmail.trim() } : { phone: otpPhone.trim() },
        otpCode
      );
      toast.success("Welcome back!");
      router.push(callbackUrl);
    } catch (err: any) {
      setError(err?.message || "Incorrect or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const modeTab = (m: AuthMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError("");
      }}
      className={`flex-1 h-10 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
        mode === m ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 justify-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white grid place-items-center font-bold text-sm tracking-tighter">
          EX
        </div>
        <span className="text-2xl font-bold tracking-tight">ELEKTRIX</span>
      </Link>

      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Sign in to your account</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-neutral-900 hover:underline underline-offset-2">
            Create one
          </Link>
        </p>

        <div className="flex gap-1 p-1 rounded-xl bg-neutral-100 mb-6">
          {modeTab("password", "Password", <Lock className="w-4 h-4" />)}
          {modeTab("otp", "Login with OTP", <KeyRound className="w-4 h-4" />)}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {mode === "password" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        ) : otpStep === "identifier" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendOtp();
            }}
            className="space-y-4"
          >
            <div className="flex gap-1 p-1 rounded-xl bg-neutral-100">
              <button
                type="button"
                onClick={() => setOtpChannel("email")}
                className={`flex-1 h-9 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                  otpChannel === "email" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => setOtpChannel("phone")}
                className={`flex-1 h-9 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                  otpChannel === "phone" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>

            <div>
              <label htmlFor="otp-identifier" className="block text-sm font-medium text-neutral-700 mb-1.5">
                {otpChannel === "email" ? "Email Address" : "Mobile Number"}
              </label>
              <div className="relative">
                {otpChannel === "email" ? (
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                ) : (
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                )}
                <input
                  id="otp-identifier"
                  type={otpChannel === "email" ? "email" : "tel"}
                  inputMode={otpChannel === "email" ? "email" : "numeric"}
                  value={otpChannel === "email" ? otpEmail : otpPhone}
                  onChange={(e) =>
                    otpChannel === "email" ? setOtpEmail(e.target.value) : setOtpPhone(e.target.value)
                  }
                  placeholder={otpChannel === "email" ? "name@company.com" : "98765 43210"}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
              {otpChannel === "phone" && (
                <p className="mt-1.5 text-xs text-neutral-400">
                  Use the mobile number saved on your account.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                "Send Code"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <p className="text-sm text-neutral-500">
              {otpChannel === "phone" && deliveredVia === "email" ? (
                <>
                  SMS is unavailable — we sent a 6-digit code to your account&apos;s email address
                  instead.
                </>
              ) : (
                <>
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-medium text-neutral-900">
                    {otpChannel === "email" ? otpEmail : otpPhone}
                  </span>
                  .
                </>
              )}
            </p>

            <div>
              <label htmlFor="otp-code" className="block text-sm font-medium text-neutral-700 mb-1.5">
                One-time code
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="w-full h-14 px-4 rounded-xl border border-neutral-300 text-center text-2xl tracking-[0.5em] font-semibold outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setOtpStep("identifier");
                  setError("");
                }}
                className="text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
              >
                Change email / number
              </button>
              <button
                type="button"
                onClick={() => sendOtp(true)}
                disabled={isLoading || resendIn > 0}
                className="text-neutral-600 hover:text-neutral-900 underline underline-offset-2 disabled:opacity-40 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-neutral-400 mt-6">
        By continuing you agree to ELEKTRIX&apos;s{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-700">
          Terms of Service
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-16">
      <Suspense fallback={<div className="text-center text-neutral-400 text-sm">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
