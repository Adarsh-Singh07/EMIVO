"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { FadeIn } from "@/components/animations/FadeIn";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { BRAND_CONFIG } from "@/config/branding";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
      toast.success(`Welcome to ${BRAND_CONFIG.name}`);
      router.push(callbackUrl);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 shadow-2xl p-8 sm:p-10"
      variants={itemVariants}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

      {/* Header */}
      <FadeIn direction="up" delay={0.1} className="text-center mb-8 flex flex-col items-center">
        <BrandLogo variant="icon" size={56} className="mb-4" />
        <h1 className="text-3xl font-bold tracking-tight text-white">{BRAND_CONFIG.name}</h1>
        <p className="mt-2 text-neutral-400 text-sm">{BRAND_CONFIG.tagline}</p>
      </FadeIn>

      {/* Error Message */}
      {error && (
        <FadeIn direction="up" delay={0.15} className="mb-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <p className="text-sm">{error}</p>
          </div>
        </FadeIn>
      )}

      {/* Form */}
      <form onSubmit={handleLoginSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 pl-12 pr-12 rounded-xl border border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/25"
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing In...
            </span>
          ) : (
            "Sign In"
          )}
        </motion.button>
      </form>

      {/* Footer */}
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-12 text-white">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Back link */}
        <FadeIn direction="up" delay={0.1} className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </FadeIn>

        <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading ELEKTRIX login...</div>}>
          <LoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}