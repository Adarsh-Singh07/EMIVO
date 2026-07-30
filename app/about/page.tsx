"use client";

import { motion } from "framer-motion";
import { Users, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="py-24 bg-[var(--color-primary)] text-white text-center">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Democratizing Access to Electronics in India</h1>
          <p className="text-xl text-white/80 leading-relaxed">
            EMIVO bridges the gap between Indian consumers, local electronics retailers, and financial institutions to make high-quality electronics accessible to everyone.
          </p>
        </div>
      </section>

      <section className="py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">The Problem We Solve</h2>
            <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
              Traditional retail financing is broken. We're fixing it for both sides of the counter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-[var(--color-accent)]" /> For Customers
              </h3>
              <ul className="space-y-4">
                {[
                  "Complex offline EMI paperwork",
                  "Lack of transparency in processing fees",
                  "Limited options to compare lenders"
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">×</div>
                    <span className="text-[var(--color-text-secondary)]">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Store className="w-6 h-6 text-[var(--color-accent)]" /> For Retailers
              </h3>
              <ul className="space-y-4">
                {[
                  "Losing customers due to lack of financing",
                  "Delayed payouts from finance companies",
                  "Zero data insights on customer behavior"
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">×</div>
                    <span className="text-[var(--color-text-secondary)]">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[var(--color-surface-elevated)]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Active Retailers", value: "10,000+" },
              { label: "Happy Customers", value: "2.5M+" },
              { label: "EMI Partners", value: "15+" },
              { label: "Cities Covered", value: "120+" }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-extrabold text-[var(--color-accent)] mb-2">{stat.value}</div>
                <div className="font-medium text-[var(--color-text-secondary)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your business?</h2>
          <Button size="lg" asChild className="h-14 px-8 text-lg">
            <Link href="/retail/dashboard">Join as Retailer</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Store(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
}
