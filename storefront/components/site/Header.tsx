"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  User,
  ShoppingBag,
  Menu,
  X,
  MapPin,
  ChevronDown,
  LogOut,
  Scale,
  Bell,
  Search,
} from "lucide-react";
import { useCart } from "./CartProvider";
import CartDrawer from "./CartDrawer";
import SearchBox from "./SearchBox";
import NotificationsBell from "./NotificationsBell";
import { useWishlist } from "@/lib/wishlist-context";
import { useCompareIds } from "@/lib/compare";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_PINCODE = "400070";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=mobiles", label: "Mobiles" },
  { href: "/shop?category=laptops", label: "Laptops" },
  { href: "/shop?category=audio", label: "Audio" },
  { href: "/shop?category=appliances", label: "Appliances" },
  { href: "/shop?category=wearables", label: "Wearables" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

/**
 * Black announcement ribbon. Scrolls as a marquee on EVERY viewport —
 * mobile included — instead of sitting still or being clipped away.
 * The two identical copies make the translateX(-50%) loop seamless.
 */
function TopRibbon() {
  const copy = (
    <div className="flex items-center gap-6 pr-6 whitespace-nowrap">
      <span>
        Enjoy free shipping on orders over ₹999!{" "}
        <Link href="/shop" className="underline underline-offset-2 font-medium">
          Shop Now
        </Link>
      </span>
      <span className="opacity-50">•</span>
      <Link href="/order-tracking" className="opacity-80 hover:opacity-100">
        Order Tracking
      </Link>
      <Link href="/about" className="opacity-80 hover:opacity-100">
        About Us
      </Link>
      <Link href="/faq" className="opacity-80 hover:opacity-100">
        FAQ
      </Link>
      <span className="opacity-50">•</span>
      <span className="opacity-80">English · INR</span>
    </div>
  );

  return (
    <div className="bg-neutral-950 text-white text-xs overflow-hidden">
      <div className="flex w-max animate-marquee">
        {copy}
        {copy}
      </div>
    </div>
  );
}

export default function Header() {
  const { count, setDrawerOpen } = useCart();
  const { user, logout } = useAuth();
  const wishlist = useWishlist();
  const compareIds = useCompareIds();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pincode, setPincode] = useState(DEFAULT_PINCODE);
  const [pincodeDraft, setPincodeDraft] = useState(DEFAULT_PINCODE);
  const [pinOpen, setPinOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Load the saved pincode only after mount to avoid SSR hydration mismatch.
  useEffect(() => {
    const saved = localStorage.getItem("elektrix-pincode");
    if (saved) {
      setPincode(saved);
      setPincodeDraft(saved);
    }
  }, []);

  const applyPincode = () => {
    const v = pincodeDraft.trim();
    if (/^\d{6}$/.test(v)) {
      setPincode(v);
      localStorage.setItem("elektrix-pincode", v);
      setPinOpen(false);
      toast.success(`Delivering to ${v}`);
    } else {
      toast.error("Enter a valid 6-digit pincode");
    }
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    toast.success("Signed out successfully");
    router.push("/");
  };

  const displayName = user
    ? `${user.first_name || ""}`.trim() || user.email?.split("@")[0] || "Account"
    : null;

  return (
    <>
      <TopRibbon />

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-4 h-[72px] flex items-center gap-3 lg:gap-5">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo + tagline */}
          <Link href="/" className="flex flex-col items-start shrink-0 leading-none">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white grid place-items-center font-bold text-sm tracking-tighter">
                EX
              </div>
              <span className="text-2xl font-bold tracking-tight">ELEKTRIX</span>
            </div>
            <span className="hidden sm:block text-[10px] text-neutral-500 mt-0.5 ml-10">
              India&apos;s Premium Electronics Store
            </span>
          </Link>

          {/* Delivering-to widget (desktop) */}
          <button
            onClick={() => setPinOpen((v) => !v)}
            className="hidden lg:flex flex-col items-start text-left shrink-0"
            aria-label="Change delivery pincode"
          >
            <span className="text-[11px] text-neutral-500">Delivering to</span>
            <span className="text-sm font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-neutral-500" /> {pincode}
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                  pinOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {/* Search bar (tablet + desktop) */}
          <div className="hidden md:flex flex-1 items-stretch max-w-2xl mx-auto">
            <SearchBox />
          </div>

          {/* Mobile search shortcut */}
          <button
            className="md:hidden p-2"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="flex-1 lg:hidden" />

          {/* Right icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Auth: Sign in or User menu */}
            {user ? (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 p-2 hover:bg-neutral-100 rounded-full"
                  aria-label="Account menu"
                >
                  <div className="w-7 h-7 rounded-full bg-neutral-950 text-white grid place-items-center text-xs font-bold">
                    {(displayName?.[0] || "U").toUpperCase()}
                  </div>
                  <span className="text-sm flex flex-col leading-tight">
                    <span className="text-[11px] text-neutral-500">Hello,</span>
                    <span className="font-medium max-w-[80px] truncate">{displayName}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-40 w-52 rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-xs text-neutral-500">Signed in as</p>
                        <p className="text-sm font-semibold truncate">{user.email}</p>
                      </div>
                      <nav className="p-2">
                        <Link
                          href="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-neutral-50"
                        >
                          <User className="w-4 h-4" /> My Account
                        </Link>
                        <Link
                          href="/account/orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-neutral-50"
                        >
                          <ShoppingBag className="w-4 h-4" /> My Orders
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-red-50 text-red-600"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </nav>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden lg:flex items-center gap-2 p-2 hover:bg-neutral-100 rounded-full"
              >
                <User className="w-5 h-5" />
                <span className="text-sm flex flex-col leading-tight">
                  <span className="text-[11px] text-neutral-500">Hello,</span>
                  <span className="font-medium">Sign in</span>
                </span>
              </Link>
            )}

            {/* Notifications (logged in only) */}
            <NotificationsBell />

            {/* Compare */}
            <Link
              href="/compare"
              className="relative p-2 hover:bg-neutral-100 rounded-full hidden sm:block"
              aria-label={`Compare (${compareIds.length} products)`}
            >
              <Scale className="w-5 h-5" />
              {compareIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-950 text-white text-[10px] grid place-items-center">
                  {compareIds.length}
                </span>
              )}
            </Link>

            {/* Wishlist */}
            <Link
              href="/account/wishlist"
              className="relative p-2 hover:bg-neutral-100 rounded-full"
              aria-label={`Wishlist (${wishlist.count} items)`}
            >
              <Heart className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-950 text-white text-[10px] grid place-items-center">
                {wishlist.count}
              </span>
            </Link>

            {/* Cart */}
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

        {/* Mobile pincode strip */}
        <button
          onClick={() => setPinOpen((v) => !v)}
          className="lg:hidden w-full flex items-center gap-2 border-t border-neutral-100 px-4 py-2 text-xs text-neutral-600"
          aria-label="Change delivery pincode"
        >
          <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
          Delivering to <span className="font-semibold text-neutral-900">{pincode}</span>
          <ChevronDown
            className={`w-4 h-4 ml-auto text-neutral-400 transition-transform ${
              pinOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Desktop category nav */}
        <nav className="hidden lg:block border-t border-neutral-100">
          <div className="max-w-[1400px] mx-auto px-4 h-11 flex items-center gap-7 text-sm">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-neutral-700 hover:text-neutral-950 font-medium"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Pincode dropdown */}
        {pinOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setPinOpen(false)} />
            <div className="absolute right-4 top-full mt-2 z-40 w-72 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
              <p className="text-sm font-semibold">Deliver to</p>
              <p className="text-xs text-neutral-500 mt-1">Currently delivering to {pincode}</p>
              <div className="flex gap-2 mt-3">
                <input
                  value={pincodeDraft}
                  onChange={(e) => setPincodeDraft(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  aria-label="Pincode"
                  className="flex-1 min-w-0 h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                />
                <button
                  onClick={applyPincode}
                  className="h-10 px-4 rounded-lg bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800"
                >
                  Apply
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                Enter pincode to check delivery options
              </p>
            </div>
          </>
        )}

        {/* Mobile dropdown nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-neutral-100 bg-white">
            <nav className="flex flex-col p-4 gap-3 text-[15px] font-medium">
              {NAV_LINKS.map((l) => (
                <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)}>
                  {l.label}
                </Link>
              ))}
              <Link href="/compare" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                Compare{compareIds.length > 0 ? ` (${compareIds.length})` : ""}
              </Link>
              <Link
                href="/notifications"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <Bell className="w-4 h-4" /> Notifications
              </Link>
              <div className="border-t border-neutral-100 pt-3 mt-1">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 text-sm"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                ) : (
                  <Link href="/login" className="flex items-center gap-2 text-sm font-semibold">
                    <User className="w-4 h-4" /> Sign In
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Mobile search sheet — same suggestions as the desktop bar */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-white">
          <div className="flex items-center gap-2 p-4 border-b border-neutral-100">
            <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} />
            <button
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="p-2 shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      <CartDrawer />
    </>
  );
}
