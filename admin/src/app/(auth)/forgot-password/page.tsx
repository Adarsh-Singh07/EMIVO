"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [step, setStep] = useState<"email" | "success">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      // The backend emails a single-use reset link (valid 30 minutes) and is
      // anti-enumeration: it always reports success, so the success screen
      // never reveals whether the account exists.
      await forgotPassword({ email: trimmed });
      setStep("success");
    } catch (err: any) {
      const message = err.message || "Failed to send the reset email. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to sign in
        </Link>

        <div className="rounded-md border border-neutral-200 bg-white p-6 sm:p-8">
          {step === "email" ? (
            <>
              <h1 className="text-xl font-semibold text-neutral-900">Reset your password</h1>
              <p className="mt-1 text-sm text-neutral-600">
                We&apos;ll email a single-use reset link. It expires in 30 minutes.
              </p>

              {error && (
                <Alert tone="danger" className="mt-4">
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-800">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@elektrix.in"
                    className="ex-input"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-3.5 text-sm font-medium text-white transition-colors hover:border-neutral-700 hover:bg-neutral-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="mt-5 text-sm text-neutral-600">
                Remembered it?{" "}
                <Link href="/login" className="text-emerald-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-neutral-900">Check your email</h1>
              <p className="mt-2 text-sm text-neutral-600">
                If an account exists for <span className="font-medium text-neutral-900">{email.trim()}</span>,
                we&apos;ve sent a password reset link. It expires in 30 minutes.
              </p>
              <p className="mt-3 text-sm text-neutral-600">
                Didn&apos;t receive it? Check the spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-emerald-700 hover:underline"
                >
                  resend
                </button>{" "}
                from the start.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3.5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
