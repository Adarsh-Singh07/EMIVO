"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Smartphone, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { PasswordRules, passwordMeetsAllRules } from "@/components/PasswordRules";
import { storeApi } from "@/lib/store-api";
import { explainApiError } from "@/lib/errors";

type FieldName = "first_name" | "last_name" | "email" | "phone" | "password";

/**
 * Translates raw API errors into plain language a shopper can act on.
 * The backend's 422 body arrives (via the API client) as a joined string of
 * "body.<field>: <reason>" entries; 429 comes from the rate limiter.
 */
function explainRegisterError(err: any): {
  summary: string;
  field?: FieldName;
  fieldText?: string;
} {
  const status = Number(err?.status ?? 0);
  const raw = String(err?.message || "");
  const lower = raw.toLowerCase();

  if (status === 429 || lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      summary:
        "You've tried several times in a short window. For security, please wait 5 minutes and try again.",
    };
  }
  if (status === 400 && (lower.includes("already") || lower.includes("taken"))) {
    return {
      summary:
        "An account with this email or mobile number already exists — try signing in instead, or use a different email.",
    };
  }

  // Field validation (422): collect every field the server complained about.
  const problems: Array<{ field: FieldName; text: string }> = [];
  if (lower.includes("body.password") || (lower.includes("password") && lower.includes("character"))) {
    const missing: string[] = [];
    if (lower.includes("uppercase")) missing.push("an uppercase letter");
    if (lower.includes("lowercase")) missing.push("a lowercase letter");
    if (lower.includes("number") || lower.includes("digit")) missing.push("a number");
    if (lower.includes("special")) missing.push("a special character (like ! or @)");
    if (!missing.length) missing.push("at least 8 characters");
    problems.push({
      field: "password",
      text: "Your password is missing " + missing.join(" and ") + ". Check the checklist below.",
    });
  }
  if (lower.includes("body.last_name") || lower.includes("last name")) {
    problems.push({ field: "last_name", text: "Please enter your last name." });
  }
  if (lower.includes("body.phone") || (lower.includes("phone") && lower.includes("character"))) {
    problems.push({ field: "phone", text: "Enter a valid 10-digit Indian mobile number." });
  }
  if (lower.includes("body.email") || (lower.includes("email") && lower.includes("valid"))) {
    problems.push({ field: "email", text: "That email address doesn't look valid — please check it." });
  }

  if (problems.length) {
    return {
      summary: "We couldn't create your account: " + problems.map((p) => p.text).join(" "),
      field: problems[0].field,
      fieldText: problems[0].text,
    };
  }

  return { summary: raw || "Registration failed. Please try again in a moment." };
}

function RegisterForm() {
  const router = useRouter();
  const { register, requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<{ field: FieldName; text: string } | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (fieldError) setFieldError(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const updatePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (fieldError) setFieldError(null);
    let d = e.target.value.replace(/\D/g, "");
    if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
    setForm((f) => ({ ...f, phone: d.slice(0, 10) }));
    setPhoneTaken(false);
  };

  const updateEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (fieldError) setFieldError(null);
    setForm((f) => ({ ...f, email: e.target.value }));
    setEmailTaken(false);
  };

  const digits = form.phone;
  const phoneValid = /^[6-9]\d{9}$/.test(digits);

  const allRulesPass = passwordMeetsAllRules(form.password);
  const passwordsMatch = form.password === form.confirmPassword;
  const confirmTouched = form.confirmPassword.length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  // Live duplicate check: 450ms debounce, cancelled on the next keystroke.
  useEffect(() => {
    if (!emailValid) return;
    let active = true;
    const t = setTimeout(() => {
      storeApi.checkAvailability({ email: form.email.trim() }).then((r) => {
        if (active) setEmailTaken(r.email_taken);
      });
    }, 450);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [form.email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!phoneValid) return;
    let active = true;
    const t = setTimeout(() => {
      storeApi.checkAvailability({ phone: digits }).then((r) => {
        if (active) setPhoneTaken(r.phone_taken);
      });
    }, 450);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps
  // The Create Account button stays disabled until everything the backend
  // enforces is already satisfied client-side.
  const formValid =
    allRulesPass &&
    passwordsMatch &&
    phoneValid &&
    emailValid &&
    !emailTaken &&
    !phoneTaken &&
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (!emailValid) {
      setError("That email address doesn't look valid — please check it (e.g. name@example.com)");
      return;
    }
    if (!phoneValid) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (!allRulesPass) {
      setError("Password does not meet all the requirements");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { verificationRequired } = await register({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: digits,
      });
      if (verificationRequired) {
        setOtpEmail(form.email.trim());
        setStep("otp");
      } else {
        toast.success("Account created! Welcome to ELEKTRIX.");
        router.push("/");
      }
    } catch (err: any) {
      const mapped = explainApiError(err);
      setError(mapped.summary);
      setFieldError(
        mapped.field && (["first_name", "last_name", "email", "phone", "password"] as const).includes(mapped.field as FieldName)
          ? { field: mapped.field as FieldName, text: mapped.fieldText ?? mapped.summary }
          : null,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.replace(/\D/g, "");
    if (code.length !== 6) {
      setOtpError("Enter the 6-digit code from your email");
      return;
    }
    setOtpError("");
    setOtpBusy(true);
    try {
      await verifyOtp({ email: otpEmail }, code);
      toast.success("Account activated! Welcome to ELEKTRIX.");
      router.push("/");
    } catch (err: any) {
      setOtpError(
        err?.message || "That code wasn't accepted. Check your email and try again, or resend the code."
      );
    } finally {
      setOtpBusy(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setResent(false);
    setOtpError("");
    try {
      await requestOtp({ email: otpEmail });
      setResent(true);
    } catch (err: any) {
      setOtpError(
        String(err?.message || "").includes("minute")
          ? "Please wait a minute before requesting another code."
          : err?.message || "Could not resend the code right now."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 justify-center mb-8">
        <img src="/branding/icon.png" alt="ELEKTRIX" className="w-10 h-10 rounded-xl object-cover" />
        <span className="text-2xl font-bold tracking-tight">ELEKTRIX</span>
      </Link>

      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          {step === "details" ? "Create your account" : "Verify your email"}
        </h1>
        <p className="text-sm text-neutral-500 mb-8">
          {step === "details" ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-neutral-900 hover:underline underline-offset-2">
                Sign in
              </Link>
            </>
          ) : (
            <>
              Step 2 of 2 — we just sent a 6-digit code to{" "}
              <span className="font-medium text-neutral-800">{otpEmail}</span>. Enter it below to
              activate your account.
            </>
          )}
        </p>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {step === "details" && (
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
                  placeholder="First Name"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
              {fieldError?.field === "first_name" && (
                <p className="mt-1 text-xs text-red-600">{fieldError.text}</p>
              )}
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="last_name"
                type="text"
                value={form.last_name}
                onChange={update("last_name")}
                placeholder="Last Name"
                className="w-full h-11 px-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                disabled={isLoading}
              />
              {fieldError?.field === "last_name" && (
                <p className="mt-1 text-xs text-red-600">{fieldError.text}</p>
              )}
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
                pattern="[0-9]*"
                value={form.phone}
                onChange={updatePhone}
                placeholder="1234567890"
                maxLength={10}
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                required
                disabled={isLoading}
              />
            </div>
            {phoneTaken ? (
              <p className="mt-1 text-xs text-red-600">
                This mobile number is already registered. One account per number — use a different number.
              </p>
            ) : !phoneValid && form.phone ? (
              <p className="mt-1 text-xs text-neutral-400">Enter a 10-digit Indian mobile number</p>
            ) : null}
            {fieldError?.field === "phone" && (
              <p className="mt-1 text-xs text-red-600">{fieldError.text}</p>
            )}
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
                onChange={updateEmail}
                placeholder="name@company.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
                required
                disabled={isLoading}
              />
            </div>
            {emailTaken ? (
              <p className="mt-1 text-xs text-red-600">
                This email is already registered —{" "}
                <Link href="/login" className="font-medium underline underline-offset-2">
                  sign in
                </Link>{" "}
                instead.
              </p>
            ) : form.email && !emailValid ? (
              <p className="mt-1 text-xs text-neutral-400">
                Enter a valid email, e.g. name@example.com (must include &apos;@&apos;)
              </p>
            ) : null}
            {fieldError?.field === "email" && (
              <p className="mt-1 text-xs text-red-600">{fieldError.text}</p>
            )}
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
                onFocus={() => setShowRules(true)}
                placeholder="Create a password"
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
            {fieldError?.field === "password" && (
              <p className="mt-2 text-xs text-red-600">{fieldError.text}</p>
            )}
            {showRules && <PasswordRules password={form.password} />}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                placeholder="Re-enter the password"
                className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm outline-none focus:ring-1 transition-colors ${
                  confirmTouched && !passwordsMatch
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-neutral-300 focus:border-neutral-950 focus:ring-neutral-950"
                }`}
                required
                disabled={isLoading}
              />
            </div>
            {confirmTouched && (
              <p className={`mt-1 text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !formValid}
            className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
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
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <Mail className="w-5 h-5 shrink-0" />
              <span>
                We sent a 6-digit code to <span className="font-medium">{otpEmail}</span>.
                Enter it to activate your account.
              </span>
            </div>

            <div>
              <label htmlFor="otp_code" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Verification Code <span className="text-red-500">*</span>
              </label>
              <input
                id="otp_code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (otpError) setOtpError("");
                }}
                placeholder="000000"
                maxLength={6}
                className="w-full h-14 px-4 rounded-xl border border-neutral-300 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-colors"
              />
            </div>

            {otpError && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {otpError}
              </div>
            )}

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpBusy || otpCode.length !== 6}
              className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {otpBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating…
                </>
              ) : (
                "Verify & Activate Account"
              )}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setOtpError("");
                }}
                className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || resent}
                className="text-neutral-700 font-medium hover:text-neutral-950 disabled:opacity-50"
              >
                {resending ? (
                  "Resending…"
                ) : resent ? (
                  "Code re-sent"
                ) : (
                  "Didn't get it? Resend code"
                )}
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 text-center">
              Check your spam folder if the code doesn&apos;t arrive. Codes expire in 10 minutes.
            </p>
          </div>
        )}
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
