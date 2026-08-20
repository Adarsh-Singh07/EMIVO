"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email: email.toLowerCase() });
      setSubmitted(true);
      toast.success("If an account exists for this email, we have sent password reset instructions.");
    } catch (err: any) {
      // Always show success for security (no user enumeration)
      setSubmitted(true);
      toast.success("If an account exists for this email, we have sent password reset instructions.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white grid place-items-center font-bold text-sm tracking-tighter">
            EX
          </div>
          <span className="text-2xl font-bold tracking-tight">ELEKTRIX</span>
        </Link>

        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold tracking-tight mb-3">Check your email</h1>
          <p className="text-sm text-neutral-500 mb-8">
            If an account exists for <span className="font-medium text-neutral-900">{email}</span>,
            you will receive password reset instructions shortly.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
          >
            Back to Sign In
          </Link>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Didn't receive the email?{" "}
          <Link href="/forgot-password" className="underline underline-offset-2 hover:text-neutral-700">
            Try again
          </Link>
        </p>
      </div>
    );
  }

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
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Forgot password?</h1>
        <p className="text-sm text-neutral-500 mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
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

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-neutral-400 mt-6">
        Remember your password?{" "}
        <Link href="/login" className="underline underline-offset-2 hover:text-neutral-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-16">
      <Suspense fallback={<div className="text-center text-neutral-400 text-sm">Loading…</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}