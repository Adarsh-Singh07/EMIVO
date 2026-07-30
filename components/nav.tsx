"use client";

import Link from "next/link";
import { ShoppingCart, Heart, User, Search, Menu } from "lucide-react";
import { motion } from "framer-motion";

export function Nav() {
  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold tracking-tight text-[var(--color-primary)]">
            EMIVO
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-[var(--color-text-secondary)]">
            <Link href="/products" className="hover:text-[var(--color-primary)] transition-colors">Shop</Link>
            <Link href="/about" className="hover:text-[var(--color-primary)] transition-colors">About</Link>
            <Link href="/retail/dashboard" className="hover:text-[var(--color-primary)] transition-colors">Retailers</Link>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search products, brands, or categories..." 
              className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-full)] py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/ai-demo" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-semibold hover:bg-[var(--color-accent)]/20 transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]"></span>
            </span>
            AI Assistant
          </Link>
          <Link href="/account/dashboard" className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <Heart className="w-5 h-5" />
          </Link>
          <Link href="/account/dashboard" className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <User className="w-5 h-5" />
          </Link>
          <Link href="/products" className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <ShoppingCart className="w-5 h-5" />
          </Link>
          <button className="md:hidden p-2 text-[var(--color-text-secondary)]">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
