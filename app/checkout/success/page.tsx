"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  Clock,
  IndianRupee,
  MapPin,
  Package,
  Sparkles,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { LedgerFigure } from "@/components/ui/ledger-figure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderData {
  totalItems: number;
  orderTotal: number;
  monthlyAmount: number;
  tenure: number;
  leadTitle: string;
}

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const orderId = `EMI-${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => {
    const stored = window.sessionStorage.getItem("emivo-last-order");
    if (stored) {
      try {
        setOrder(JSON.parse(stored));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const totalItems = order?.totalItems ?? 1;
  const orderTotal = order?.orderTotal ?? 0;
  const monthlyAmount = order?.monthlyAmount ?? 0;
  const tenure = order?.tenure ?? 12;
  const leadTitle = order?.leadTitle ?? "your EMIVO order";

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Premium glow background */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-[var(--color-success)]/15 blur-[140px]" />
      </motion.div>

      <div className="relative z-10 px-4 py-10 md:py-16">
        <div className="container-emivo max-w-2xl">
          {/* Success checkmark */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
            className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[var(--color-success)] bg-[var(--color-success)]/15 shadow-[0_0_50px_rgba(34,197,94,0.25)]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.35 }}
            >
              <Check className="h-14 w-14 text-[var(--color-success)]" />
            </motion.div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-center"
          >
            <Badge variant="emi" className="mb-4">Instantly approved</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-foreground)] md:text-5xl">
              EMI confirmed. You&apos;re all set.
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-secondary)] md:text-lg">
              Your financing for {leadTitle} is locked in. We&apos;ve routed your order to the nearest EMIVO retail partner.
            </p>
          </motion.div>

          {/* Order details card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)]"
          >
            {/* Order ID header */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-4">
              <div className="flex items-center gap-2 text-sm">
                <BadgeCheck className="h-4 w-4 text-[var(--color-success)]" />
                <span className="font-semibold text-[var(--color-foreground)]">Order ID</span>
              </div>
              <code className="rounded-lg bg-[var(--color-background)] px-3 py-1.5 font-mono text-sm font-bold tracking-wide text-[var(--color-foreground)]">
                {orderId}
              </code>
            </div>

            {/* Details grid */}
            <div className="grid gap-6 p-6 md:grid-cols-2">
              {/* Financing summary */}
              <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-secondary)]">Your EMI plan</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-xs font-semibold text-[var(--color-secondary)]">Monthly payment</span>
                    <LedgerFigure paisa={monthlyAmount} size="xl" tone="accent" suffix="/mo" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-secondary)]">Duration</span>
                    <span className="font-bold">{tenure} months</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-secondary)]">Financed amount</span>
                    <LedgerFigure paisa={orderTotal} size="sm" noLine tone="navy" />
                  </div>
                </div>
              </div>

              {/* Delivery details */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[var(--color-primary)]" />
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-secondary)]">Delivery</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />
                    <div>
                      <div className="font-bold text-[var(--color-foreground)]">Express delivery</div>
                      <div className="text-sm text-[var(--color-secondary)]">Tomorrow by 8:00 PM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                    <div>
                      <div className="font-bold text-[var(--color-foreground)]">Arriving at your address</div>
                      <div className="text-sm text-[var(--color-secondary)]">Bangalore â€¢ 560001</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 px-6 py-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--color-secondary)]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">What happens next</span>
              </div>
              <div className="grid gap-3 text-sm">
                {[
                  { icon: IndianRupee, label: "Mandate active", sub: "Auto-debit scheduled for the 5th of each month", done: true },
                  { icon: Package, label: "Order packed", sub: "Partner retailer preparing your item", done: false },
                  { icon: Truck, label: "Out for delivery", sub: "You&apos;ll receive a tracking link via SMS", done: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-full ${step.done ? "bg-[var(--color-success)]/15 text-[var(--color-success)]" : "bg-[var(--color-surface)] text-[var(--color-secondary)]"}`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${step.done ? "text-[var(--color-foreground)]" : "text-[var(--color-secondary)]"}`}>{step.label}</div>
                      <div className="text-xs text-[var(--color-secondary)]">{step.sub}</div>
                    </div>
                    {step.done && <Check className="h-4 w-4 text-[var(--color-success)]" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <Button asChild variant="accent" size="lg" className="rounded-full font-bold">
              <Link href="/account/dashboard">
                View order details <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/">Continue shopping</Link>
            </Button>
          </motion.div>

          {/* Trust footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-10 text-center text-xs text-[var(--color-secondary)]"
          >
            EMIVO partners with RBI-registered NBFCs for transparent, compliant EMI financing. No hidden fees.
          </motion.p>
        </div>
      </div>
    </main>
  );
}

