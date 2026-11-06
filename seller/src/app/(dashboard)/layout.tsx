"use client";

import { useEffect, useState } from "react";
import Link from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { 
  Store, 
  Package, 
  PlusCircle, 
  ShoppingCart, 
  User, 
  LogOut, 
  ExternalLink, 
  Star,
  Layers,
  Menu,
  X
} from "lucide-react";
import { authStorage } from "@/lib/api-client";

interface SellerInfo {
  id: string;
  name: string;
  business_name: string;
  email: string;
  city?: string;
  status: string;
  rating: number;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Layers },
  { href: "/products", label: "Inventory & Products", icon: Package },
  { href: "/products/new", label: "Add Product", icon: PlusCircle },
  { href: "/orders", label: "Orders to Pack", icon: ShoppingCart },
  { href: "/profile", label: "Seller Profile", icon: User },
];

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 animate-pulse text-amber-500" />
          <span>Loading Seller Central...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                <Store className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  ELEKTRIX
                </span>
                <span className="ml-1.5 text-xs uppercase tracking-wider text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-400/10">
                  Seller
                </span>
              </div>
            </a>
          </div>

          {/* Right Profile & Store Link */}
          <div className="flex items-center gap-4">
            {seller && (
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                <span className="font-semibold text-white">{seller.business_name}</span>
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {Number(seller.rating || 4.9).toFixed(1)}
                </span>
              </div>
            )}

            <a
              href="https://elektrix.in"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <span>Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation Bar */}
        <nav className="hidden md:flex bg-slate-900/90 border-t border-slate-800/60 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    isActive
                      ? "border-amber-500 text-amber-400 bg-amber-500/5"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? "bg-amber-500/20 text-amber-300" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </a>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>ELEKTRIX Seller Central &copy; {new Date().getFullYear()} — Multi-Category Marketplace</p>
      </footer>
    </div>
  );
}
