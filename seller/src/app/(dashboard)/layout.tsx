"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Package, 
  PlusCircle, 
  ShoppingCart, 
  User, 
  LogOut, 
  ExternalLink, 
  Star,
  Layers,
  Menu,
  X,
  Store,
  ShieldCheck
} from "lucide-react";
import { authStorage } from "@/lib/api-client";
import { BrandLogo } from "@/components/branding/BrandLogo";

interface SellerInfo {
  id: string;
  name: string;
  business_name: string;
  email: string;
  city?: string;
  status: string;
  rating: number;
  rating_count?: number;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Layers },
  { href: "/products", label: "Inventory & Products", icon: Package },
  { href: "/products/new", label: "Add / Search Catalog", icon: PlusCircle },
  { href: "/orders", label: "Orders to Pack", icon: ShoppingCart },
  { href: "/profile", label: "Warehouse & Profile", icon: User },
];

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const info = authStorage.getSeller();
    if (info) {
      setSeller(info as SellerInfo);
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    authStorage.clearToken();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-neutral-400">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-medium">Loading Seller Central...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-neutral-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-neutral-200 bg-white transition-all duration-200 ease-in-out ${
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden opacity-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex-shrink-0 flex items-center px-5 border-b border-neutral-200 w-64 justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size={32} subtitle="SELLER CENTRAL" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Merchant Card */}
        {seller && (
          <div className="p-3.5 border-b border-neutral-100 bg-neutral-50/50 w-64">
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <span className="block text-xs font-bold text-neutral-900 truncate">
                  {seller.business_name || "Merchant"}
                </span>
                <span className="block text-[11px] text-neutral-500 truncate mt-0.5">
                  {seller.email}
                </span>
              </div>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-600 font-medium">
              {seller.rating > 0 && (seller.rating_count ?? 0) > 0 ? (
                <>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>{Number(seller.rating).toFixed(1)} rating</span>
                </>
              ) : (
                <span className="text-neutral-500 font-normal">New Seller</span>
              )}
              {seller.city && <span className="text-neutral-400">&bull; {seller.city}</span>}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-1.5 w-64">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Fulfillment & Catalog
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-neutral-950 text-white font-semibold shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-medium"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-neutral-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-neutral-200 w-64 space-y-1">
          <a
            href="https://elektrix.in"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            <span>Open Storefront</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
        sidebarOpen ? "lg:ml-64" : "ml-0"
      }`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 flex-shrink-0 border-b border-neutral-200 bg-white/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
                ELEKTRIX Marketplace Merchant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Product</span>
            </Link>
            <a
              href="https://elektrix.in"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              <span>View Storefront</span>
            </a>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white py-4 px-6 text-center text-xs text-neutral-500">
          <p>ELEKTRIX Seller Central &copy; {new Date().getFullYear()}. Central Delhivery Logistics Network.</p>
        </footer>
      </div>
    </div>
  );
}
