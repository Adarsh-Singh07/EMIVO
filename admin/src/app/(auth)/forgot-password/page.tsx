"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Phone, AlertCircle, Loader2, CheckCircle, RotateCcw, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { FadeIn } from "@/components/animations/FadeIn";
import { toast } from "sonner";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword } = useAuth();

  const [step, setStep] = useState<"phone" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword({ phone });
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to send reset OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-amber-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Back link */}
        <FadeIn direction="up" delay={0.1} className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>
        </FadeIn>

        {/* Glassmorphic Card */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl p-8 sm:p-10"
          variants={itemVariants}
          whileHover={{ y: -2, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
          transition={{ duration: 0.3 }}
        >
          {/* Decorative top accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

          {/* Header */}
          <FadeIn direction="up" delay={0.1} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4 shadow-lg shadow-amber-500/25">
              {step === "phone" ? (
                <Mail className="w-7 h-7 text-white" />
              ) : (
                <CheckCircle className="w-7 h-7 text-white" />
              )}
            </div>
            {step === "phone" ? (
              <>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Forgot Password?</h1>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400">Enter your phone number to receive a reset OTP</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Check Your Phone</h1>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                  We&apos;ve sent a 6-digit OTP to <span className="font-medium text-neutral-900 dark:text-white">+91 {phone.slice(0, 5)} {phone.slice(5)}</span>
                </p>
              </>
            )}
          </FadeIn>

          {/* Error Message */}
          {error && (
            <FadeIn direction="up" delay={0.15} className="mb-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </motion.div>
            </FadeIn>
          )}

          {/* Phone Step */}
          {step === "phone" && (
            <FadeIn direction="up" delay={0.2} className="space-y-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => validatePhone(e.target.value)}
                      placeholder="Enter 10-digit phone number"
                      inputMode="numeric"
                      maxLength={10}
                      className="w-full h-12 pl-12 pr-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      autoComplete="tel"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading || phone.length !== 10}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/25"
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending OTP...
                    </span>
                  ) : (
                    "Send Reset OTP"
                  )}
                </motion.button>
              </form>

              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                Remember your password?{" "}
                <Link href="/login" className="text-amber-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </FadeIn>
          )}

          {/* Success Step */}
          {step === "success" && (
            <FadeIn direction="up" delay={0.2} className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">OTP Sent Successfully</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                Enter the 6-digit code on the reset password page to create a new password.
              </p>

              <div className="flex gap-3 justify-center">
                <motion.button
                  onClick={() => router.push(`/reset-password?phone=${phone}`)}
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all shadow-lg shadow-amber-500/25"
                  whileTap={{ scale: 0.98 }}
                >
                  Go to Reset Password
                </motion.button>
                <motion.button
                  onClick={() => {
                    setPhone("");
                    setStep("phone");
                  }}
                  className="h-12 px-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-base hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
                  whileTap={{ scale: 0.98 }}
                >
                  <RotateCcw className="w-4 h-4 mr-2 inline" />
                  Resend OTP
                </motion.button>
              </div>

              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
                <Link href="/login" className="text-amber-600 hover:underline font-medium">
                  Back to Login
                </Link>
              </p>
            </FadeIn>
          )}

          {/* Footer */}
          <FadeIn direction="up" delay={0.3} className="mt-8 text-center">
            <p className="text-neutral-500 dark:text-neutral-400">
              <Link href="/" className="text-amber-600 hover:underline font-medium">
                ← Back to Home
              </Link>
            </p>
          </FadeIn>
        </motion.div>
      </motion.div>
    </div>
  );
}