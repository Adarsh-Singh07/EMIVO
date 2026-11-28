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
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { authStorage, apiClient } from "@/lib/api-client";
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
  { href: "/products", label: "Products", icon: Package },
  { href: "/products/new", label: "Add product", icon: PlusCircle },
  { href: "/orders", label: "Orders to pack", icon: ShoppingCart },
  { href: "/returns", label: "Returns", icon: RotateCcw },
  { href: "/profile", label: "Warehouse & profile", icon: User },
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

    // Fetch fresh profile from API to ensure live ratings, status & verification
    apiClient
      .get<SellerInfo>("/seller/me")
      .then((fresh: SellerInfo) => {
        if (fresh) {
          setSeller(fresh);
          authStorage.setSeller(fresh as unknown as Record<string, unknown>);
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = () => {
    authStorage.clearToken();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Store className="h-4 w-4" aria-hidden />
          Loading Seller Central…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-neutral-200 bg-white transition-[margin,width] duration-150 ease-out ${
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden opacity-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-14 w-64 flex-shrink-0 items-center justify-between border-b border-neutral-200 px-4">
          <Link href="/" className="flex items-center">
            <BrandLogo size={28} subtitle="Seller central" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Merchant Card */}
        {seller && (
          <div className="w-64 border-b border-neutral-200 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium text-neutral-900">
                  {seller.business_name || "Merchant"}
                </span>
                <span className="block truncate text-xs text-neutral-500">{seller.email}</span>
              </div>
              {seller.status?.toUpperCase() === "ACTIVE" || seller.status?.toUpperCase() === "VERIFIED" ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Verified
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-600">
              {seller.rating > 0 && (seller.rating_count ?? 0) > 0 ? (
                <>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden />
                  <span>{Number(seller.rating).toFixed(1)} rating</span>
                </>
              ) : (
                <span className="text-neutral-500">New seller</span>
              )}
              {seller.city && <span className="text-neutral-400">· {seller.city}</span>}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="min-h-0 w-64 flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-1 text-xs text-neutral-400">Fulfillment & catalog</p>
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
                className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-neutral-700" : "text-neutral-400"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="w-64 space-y-0.5 border-t border-neutral-200 p-3">
          <a
            href="https://elektrix.in"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-neutral-400" />
            Open storefront
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex min-w-0 flex-1 flex-col transition-[margin,width] duration-150 ease-out ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="-ml-2 rounded-md p-2 text-neutral-500 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:border-neutral-700 hover:bg-neutral-700 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add product
            </Link>
            <a
              href="https://elektrix.in"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
              View storefront
            </a>
          </div>
        </header>

        {/* Page Body */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white px-6 py-4 text-center text-xs text-neutral-500">
          <p>Elektrix Seller Central · {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}
