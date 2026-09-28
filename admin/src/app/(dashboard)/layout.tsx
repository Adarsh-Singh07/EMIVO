"use client";

import {
  Settings,
  Users,
  LogOut,
  ShoppingCart,
  BarChart3,
  Package,
  Tag,
  Activity,
  UserCheck,
  Bell,
  LayoutDashboard,
  Boxes,
  Menu,
  LifeBuoy,
  Landmark,
  Timer,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useState, useRef, useCallback } from "react";
import { PageTransition } from "@/components/animations/PageTransition";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { BRAND_CONFIG } from "@/config/branding";
import { useAuth, ADMIN_ROLES } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { apiClient } from "@/lib/api-client";

const NAV_SECTIONS: Array<{
  label: string;
  links: Array<{ href: string; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Commerce",
    links: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/products", label: "Products", icon: Package },
      { href: "/products/categories", label: "Categories & Brands", icon: Package },
      { href: "/products/catalogues", label: "Homepage Catalogues", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/coupons", label: "Coupons", icon: Tag },
      { href: "/bank-offers", label: "Bank Offers", icon: Landmark },
      { href: "/abandoned-carts", label: "Abandoned Carts", icon: Timer },
      { href: "/broadcasts", label: "Broadcasts", icon: Megaphone },
      { href: "/support", label: "Support Box", icon: LifeBuoy },
    ],
  },
  {
    label: "People",
    links: [
      { href: "/customers", label: "Customers", icon: UserCheck },
      { href: "/users", label: "Users", icon: Users },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/settings", label: "Store Settings", icon: Settings },
      { href: "/profile", label: "Profile & Team", icon: UserCheck },
      { href: "/health", label: "System Health", icon: Activity },
    ],
  },
];

interface ActivityItem {
  kind: "order" | "payment";
  order_id: string;
  ref: string;
  status: string;
  total: number;
  at: string;
}

function NotificationBell() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiClient.get<{ items?: ActivityItem[] }>("/admin/activity?limit=15");
      const list = data?.items || [];
      setItems(list);
      const seen = localStorage.getItem("admin_activity_seen");
      const seenTs = seen ? Date.parse(seen) : 0;
      setUnread(list.filter((i) => Date.parse(i.at) > seenTs).length);
    } catch {
      // Non-critical; leave the bell quiet when unavailable.
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      localStorage.setItem("admin_activity_seen", new Date().toISOString());
      setUnread(0);
    }
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const statusTone = (s: string) => {
    const u = s?.toUpperCase() || "";
    if (["CONFIRMED", "SUCCESS"].includes(u)) return "text-green-700 bg-green-50";
    if (["PENDING", "CREATED", "PROCESSING"].includes(u)) return "text-amber-700 bg-amber-50";
    if (["PAYMENT_FAILED", "FAILED", "FAILURE"].includes(u)) return "text-red-700 bg-red-50";
    if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(u)) return "text-blue-700 bg-blue-50";
    return "text-neutral-600 bg-neutral-100";
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        aria-label="Store activity"
        className="relative inline-flex items-center justify-center rounded-xl p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">Store activity</p>
            <span className="text-[11px] text-neutral-400">last 3 days</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!items && (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">Loading…</p>
            )}
            {items && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">No activity in the last 3 days.</p>
            )}
            {items && items.length > 0 && items.map((it, idx) => (
              <Link
                key={`${it.kind}-${it.ref}-${idx}`}
                href={`/orders/${it.order_id}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 border-b border-neutral-50 px-4 py-3 last:border-0 hover:bg-neutral-50"
              >
                <span className={"mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + statusTone(it.status)}>
                  {it.kind === "payment" ? "₹" : "📦"} {it.status}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900">{it.ref}</span>
                  <span className="text-xs text-neutral-500">
                    ₹{(it.total / 100).toFixed(2)} · {fmt(it.at)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/orders"
            onClick={toggle}
            className="block border-t border-neutral-100 px-4 py-2.5 text-center text-xs font-medium text-neutral-500 hover:bg-neutral-50"
          >
            View all orders
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  // Start collapsed on phones/tablets so the content (not the drawer) is
  // what loads — the hamburger opens it as an overlay.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );

  const userInitial = user?.first_name ? user.first_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : "E");
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "User";

  return (
    <AuthGuard requiredRoles={[...ADMIN_ROLES]}>
      <>
        <div className="flex min-h-screen w-full bg-neutral-50 font-sans text-neutral-900">
          {/* Sidebar */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-neutral-950/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}
          <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-neutral-200 bg-white transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'}`}>
            <div className="h-16 flex-shrink-0 flex items-center px-6 border-b border-neutral-200 w-64">
              <Link href="/dashboard" className="flex items-center gap-3">
                <BrandLogo variant="wordmark" size={30} />
              </Link>
            </div>
            <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-4 w-64">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label} className="space-y-1">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    {section.label}
                  </p>
                  {section.links.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
                    >
                      <Icon className="w-5 h-5 text-neutral-500" />
                      {label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-neutral-200 w-64">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50/50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
            {/* Topbar */}
            <header className="sticky top-0 z-30 h-14 sm:h-16 flex-shrink-0 border-b border-neutral-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-6">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 -ml-2 rounded-xl text-neutral-500 hover:bg-neutral-100 transition-colors"
                  aria-label="Toggle Sidebar"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 hidden sm:inline-block">
                  {BRAND_CONFIG.name} Operations
                </span>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <Link href="/profile" className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {userInitial}
                  </div>
                  <span className="text-sm font-medium text-neutral-700 hidden sm:block">
                    {userName}
                  </span>
                </Link>
              </div>
            </header>

            {/* Page Content */}
            <div className="flex-1 p-3 sm:p-6 bg-neutral-50/50">
              <div className="mx-auto max-w-6xl">
                <PageTransition>{children}</PageTransition>
              </div>
            </div>
          </main>
        </div>
      </>
    </AuthGuard>
  );
}
