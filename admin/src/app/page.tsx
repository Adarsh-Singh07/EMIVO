"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { BRAND_CONFIG } from "@/config/branding";
import { ArrowRight, ShieldCheck, Zap, Layers, Server, Activity, Database, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 selection:bg-amber-500 selection:text-black">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <BrandLogo variant="wordmark" size={36} />

          <div className="flex items-center gap-4">
            <Link
              href="/preview"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 transition-all"
            >
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              Dev Preview
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-all shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 px-6">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Internal Release v0.1 — Autonomous Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight text-neutral-950 leading-[1.1]"
          >
            Autonomous Commerce & Operating Infrastructure
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-neutral-500 max-w-3xl mx-auto leading-relaxed"
          >
            {BRAND_CONFIG.tagline}. Unified POS, order processing, inventory operations, checkout payments, and live telemetry built on{" "}
            <span className="text-amber-600 font-semibold">{BRAND_CONFIG.domain}</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link
              href="/dashboard"
              className="w-full sm:w-auto h-13 px-8 rounded-xl bg-neutral-950 text-white font-bold text-base hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neutral-950/10"
            >
              Open Platform Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/health"
              className="w-full sm:w-auto h-13 px-8 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-semibold text-base hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
            >
              System Health & Status
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Infrastructure Feature Matrix */}
      <section className="py-24 px-6 border-t border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold text-neutral-900">Engineered for Zero Latency</h2>
            <p className="text-neutral-500 text-sm">
              Real-time multi-tenant execution backed by Supabase PostgreSQL, Redis 7+, and Cloudflare R2 object storage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4 hover:border-amber-500/40 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Supabase PostgreSQL + RLS</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Database-level tenant isolation enforced via `SET LOCAL ROLE emivo_app` and `app.business_id` session variables.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4 hover:border-amber-500/40 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Redis 7+ Session Cache</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Opaque refresh token family rotation with instant replay attack revocation and sliding-window rate limiting.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4 hover:border-amber-500/40 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Modular Monolith</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                AsyncSQLAlchemy, Pydantic v2 validation, and integer minor units financial accuracy across all 10 core business modules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12 px-6 bg-neutral-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-neutral-500">
          <div className="flex items-center gap-3">
            <BrandLogo variant="icon" size={24} />
            <span>© 2026 {BRAND_CONFIG.company.name} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href={BRAND_CONFIG.officialUrl} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">
              {BRAND_CONFIG.domain}
            </a>
            <Link href="/preview" className="hover:text-neutral-900 transition-colors">
              Developer Matrix
            </Link>
            <Link href="/health" className="hover:text-neutral-900 transition-colors">
              System Health
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
