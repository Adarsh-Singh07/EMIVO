"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Smartphone, AlertCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { API_URL } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const digits = form.phone.replace(/\D/g, "").replace(/^91/, "").replace(/^0/, "");
  const phoneValid = /^[6-9]\d{9}$/.test(digits);

  // Realtime availability: debounced check against the API while typing.
  useEffect(() => {
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    if (!form.phone) {
      setPhoneStatus("idle");
      return;
    }
    if (!phoneValid) {
      setPhoneStatus("invalid");
      return;
    }
    setPhoneStatus("checking");
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/auth/phone/available?phone=${encodeURIComponent(digits)}`,
          { cache: "no-store" }
        );
        const body = await res.json();
        setPhoneStatus(body.available ? "available" : "taken");
      } catch {
        setPhoneStatus("idle"); // network hiccup — submit will re-validate
      }
    }, 450);
    return () => {
      if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    };
  }, [digits, phoneValid, form.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.first_name || !form.email || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (!phoneValid) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (phoneStatus === "taken") {
      setError(
        "This mobile number is already registered on another account. If this is your number, please contact support at support@elektrix.in."
      );
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: digits,
      });
      toast.success("Account created! Welcome to ELEKTRIX.");
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrong = form.password.length >= 8;

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
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Create your account</h1>
        <p className="text-sm text-neutral-500 mb-8">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-neutral-900 hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-neutral-700 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={update("first_name")}
                  placeholder="Adarsh"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={update("phone")}
                placeholder="98765 43210"
                maxLength={13}
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                required
                disabled={isLoading}
              />
              {phoneStatus === "checking" && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin" />
              )}
              {phoneStatus === "available" && (
                <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              )}
              {phoneStatus === "taken" && (
                <XCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              )}
            </div>
            {phoneStatus === "available" && (
              <p className="mt-1 text-xs text-green-600">Mobile number is available</p>
            )}
            {phoneStatus === "taken" && (
              <p className="mt-1 text-xs text-red-500">
                Already registered on another account — contact support to reclaim it.
              </p>
            )}
            {phoneStatus === "invalid" && form.phone && (
              <p className="mt-1 text-xs text-neutral-400">Enter a 10-digit Indian mobile number</p>
            )}
          </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Last Name
              </label>
              <input
                id="last_name"
                type="text"
                value={form.last_name}
                onChange={update("last_name")}
                placeholder="Singh"
                className="w-full h-11 px-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="name@company.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="Min. 8 characters"
                className="w-full h-11 pl-10 pr-11 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${passwordStrong ? "text-green-500" : "text-neutral-300"}`}
                />
                <span className={`text-xs ${passwordStrong ? "text-green-600" : "text-neutral-400"}`}>
                  {passwordStrong ? "Strong password" : "At least 8 characters"}
                </span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                placeholder="••••••••"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account…
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-neutral-400 mt-6">
        By creating an account you agree to ELEKTRIX&apos;s{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-700">
          Terms of Service
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-16">
      <Suspense fallback={<div className="text-center text-neutral-400 text-sm">Loading…</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
