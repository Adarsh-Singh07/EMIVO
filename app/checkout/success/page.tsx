"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Package, Calendar } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const isEdge = false;

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background celebration (No confetti, premium lighting) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[800px] h-[800px] bg-green-500/10 rounded-full blur-[120px]" />
      </motion.div>

      <div className="w-full max-w-lg relative z-10 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.4 }}
          >
            <Check className="w-12 h-12 text-green-500" />
          </motion.div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-[var(--color-foreground)] mb-4 tracking-tight"
        >
          Order Confirmed
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-[var(--color-text-secondary)] mb-12"
        >
          Your EMI has been approved and your iPhone 15 Pro is being prepared for delivery.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 text-left mb-8 flex flex-col gap-6 shadow-xl"
        >
          <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-6">
            <div className="w-12 h-12 rounded bg-[var(--color-surface-elevated)] flex items-center justify-center">
              <Package className="w-6 h-6 text-[var(--color-text-secondary)]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Fulfillment</div>
              <div className="font-bold text-[var(--color-foreground)]">EMIVO Direct Retailer</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded bg-[var(--color-surface-elevated)] flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Estimated Delivery</div>
              <div className="font-bold text-[var(--color-foreground)]">Tomorrow by 8:00 PM</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/account/dashboard" className="px-8 py-4 rounded-[var(--radius-full)] bg-[var(--color-foreground)] text-[var(--color-background)] font-bold hover:scale-105 transition-transform inline-flex items-center justify-center gap-2">
            View Order Details
          </Link>
          <Link href="/" className="px-8 py-4 rounded-[var(--radius-full)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] font-bold hover:bg-[var(--color-surface-elevated)] transition-colors inline-flex items-center justify-center gap-2">
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
