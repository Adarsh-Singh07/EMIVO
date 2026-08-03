"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Heart, User, ShoppingBag, Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import { useCart } from "./CartProvider";
import CartDrawer from "./CartDrawer";

export default function Header() {
  const { count, setDrawerOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-neutral-950 text-white text-xs">
        <div className="max-w-[1400px] mx-auto px-4 h-10 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-5 opacity-80">
            <Link href="/order-tracking" className="hover:opacity-100">
              Order Tracking
            </Link>
            <Link href="/about" className="hover:opacity-100">
              About Us
            </Link>
            <Link href="/faq" className="hover:opacity-100">
              FAQ
            </Link>
          </div>
          <div className="flex-1 text-center overflow-hidden">
            <span className="inline-block whitespace-nowrap">
              Enjoy free shipping on all orders this week!{" "}
              <Link
                href="/shop"
                className="underline underline-offset-2 ml-1 inline-flex items-center gap-1"
              >
                Shop Now <ArrowRight className="w-3 h-3" />
              </Link>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 opacity-80">
            <span>English</span>
            <span>INR</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-4 h-[72px] flex items-center gap-6">
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white grid place-items-center font-bold">
              E
            </div>
            <span className="text-2xl font-bold tracking-tight">emivo</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium">
            <Link href="/" className="flex items-center gap-1 hover:text-neutral-500">
              Home <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <Link href="/shop" className="flex items-center gap-1 hover:text-neutral-500">
              Shop <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <Link href="/shop?category=mobiles" className="hover:text-neutral-500">
              Mobiles
            </Link>
            <Link href="/shop?category=laptops" className="hover:text-neutral-500">
              Laptops
            </Link>
            <Link href="/shop?category=audio" className="hover:text-neutral-500">
              Audio
            </Link>
            <Link href="/shop?category=appliances" className="hover:text-neutral-500">
              Appliances
            </Link>
            <Link href="/blog" className="hover:text-neutral-500">
              Blog
            </Link>
            <Link href="/contact" className="hover:text-neutral-500">
              Contact
            </Link>
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/shop"
              className="p-2 hover:bg-neutral-100 rounded-full"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>
            <Link
              href="/account"
              className="hidden sm:flex items-center gap-2 p-2 hover:bg-neutral-100 rounded-full"
            >
              <User className="w-5 h-5" />
              <span className="text-sm hidden md:inline">Account</span>
            </Link>
            <button className="relative p-2 hover:bg-neutral-100 rounded-full" aria-label="Wishlist">
              <Heart className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-950 text-white text-[10px] grid place-items-center">
                0
              </span>
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative p-2 hover:bg-neutral-100 rounded-full"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-950 text-white text-[10px] grid place-items-center">
                {count}
              </span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-neutral-100 bg-white">
            <nav className="flex flex-col p-4 gap-3 text-[15px] font-medium">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                Home
              </Link>
              <Link href="/shop" onClick={() => setMobileOpen(false)}>
                Shop
              </Link>
              <Link href="/shop?category=mobiles" onClick={() => setMobileOpen(false)}>
                Mobiles
              </Link>
              <Link href="/shop?category=laptops" onClick={() => setMobileOpen(false)}>
                Laptops
              </Link>
              <Link href="/shop?category=audio" onClick={() => setMobileOpen(false)}>
                Audio
              </Link>
              <Link href="/shop?category=appliances" onClick={() => setMobileOpen(false)}>
                Appliances
              </Link>
            </nav>
          </div>
        )}
      </header>

      <CartDrawer />
    </>
  );
}
