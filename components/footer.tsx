"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold mb-4">EMIVO</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Making EMI financing first-class for Indian electronics retail.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="/products" className="hover:text-[var(--color-primary)]">Shop</Link></li>
              <li><Link href="/about" className="hover:text-[var(--color-primary)]">About Us</Link></li>
              <li><Link href="/retail/dashboard" className="hover:text-[var(--color-primary)]">Retailers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="#" className="hover:text-[var(--color-primary)]">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-[var(--color-primary)]">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-[var(--color-primary)]">Refund Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"><Linkedin className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-[var(--color-text-secondary)] pt-8 border-t border-[var(--color-border)]">
          © {new Date().getFullYear()} EMIVO Demo. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
