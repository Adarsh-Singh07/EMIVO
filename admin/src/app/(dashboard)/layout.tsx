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
  Sparkles,
  Award,
  LayoutTemplate,
  CheckCircle2,
  Store,
  GitMerge,
  ClipboardCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState, useRef, useCallback } from "react";
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
      { href: "/assistant", label: "Assistant", icon: Sparkles },
    ],
  },
  {
    label: "Commerce",
    links: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/products", label: "Marketplace Catalog", icon: Package },
      { href: "/products/change-requests", label: "Product Edits", icon: ClipboardCheck },
      { href: "/catalog/duplicates", label: "Duplicate Merges", icon: GitMerge },
      { href: "/products/categories", label: "Categories", icon: Package },
      { href: "/products/categories/approvals", label: "Category Approvals", icon: CheckCircle2 },
      { href: "/products/brands", label: "Brands", icon: Award },
      { href: "/products/category-pages", label: "Category Pages", icon: LayoutTemplate },
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
      { href: "/sellers", label: "Sellers", icon: Store },
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
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      const seen = typeof window !== "undefined" ? localStorage.getItem("admin_activity_seen") : null;
      const seenTs = seen ? Date.parse(seen) : 0;
      setUnread(list.filter((i) => i?.at && Date.parse(i.at) > seenTs).length);
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
    if (["CONFIRMED", "SUCCESS", "DELIVERED", "CAPTURED"].includes(u)) return "bg-emerald-50 text-emerald-800";
    if (["PENDING", "CREATED", "PROCESSING"].includes(u)) return "bg-amber-50 text-amber-800";
    if (["PAYMENT_FAILED", "FAILED", "FAILURE", "CANCELLED"].includes(u)) return "bg-red-50 text-red-700";
    if (["SHIPPED", "OUT_FOR_DELIVERY"].includes(u)) return "bg-sky-50 text-sky-800";
    return "bg-neutral-100 text-neutral-600";
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        aria-label="Store activity"
        className="relative rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-md border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5">
            <p className="text-sm font-medium text-neutral-900">Store activity</p>
            <span className="text-xs text-neutral-500">last 3 days</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!items && <p className="px-4 py-6 text-center text-sm text-neutral-500">Loading…</p>}
            {items && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-neutral-500">No activity in the last 3 days.</p>
            )}
            {items && items.length > 0 && items.map((it, idx) => (
              <Link
                key={`${it.kind}-${it.ref}-${idx}`}
                href={`/orders/${it.order_id}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 border-b border-neutral-100 px-4 py-3 last:border-0 hover:bg-neutral-50"
              >
                <span className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${statusTone(it.status)}`}>
                  {it.kind === "payment" ? "Payment" : "Order"} · {it.status}
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
            className="block border-t border-neutral-100 px-4 py-2.5 text-center text-sm text-neutral-500 hover:bg-neutral-50"
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
  const pathname = usePathname();
  // Start collapsed on phones/tablets so content loads cleanly without obstruction.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );

  const userInitial = user?.first_name ? user.first_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : "E");
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "User";

  return (
    <AuthGuard requiredRoles={[...ADMIN_ROLES]}>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-neutral-950/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}
        <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-neutral-200 bg-white transition-[margin,width] duration-150 ease-out ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'}`}>
          <div className="flex h-14 w-64 flex-shrink-0 items-center justify-between border-b border-neutral-200 px-4">
            <Link href="/dashboard" className="flex items-center">
              <BrandLogo size={28} subtitle="Admin console" />
            </Link>
          </div>
          <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 w-64">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="space-y-0.5">
                <p className="px-3 pb-1 text-xs text-neutral-400">{section.label}</p>
                {section.links.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-neutral-100 font-medium text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-neutral-700" : "text-neutral-400"}`} />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="w-64 space-y-0.5 border-t border-neutral-200 p-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex min-w-0 flex-1 flex-col transition-[margin,width] duration-150 ease-out ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="-ml-2 rounded-md p-2 text-neutral-500 hover:bg-neutral-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={BRAND_CONFIG.sellerUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors md:inline-flex"
              >
                <Store className="h-3.5 w-3.5" />
                Seller central
              </a>
              <a
                href={BRAND_CONFIG.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors sm:inline-flex"
              >
                <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                Storefront
              </a>
              <NotificationBell />
              <Link href="/profile" className="flex items-center gap-2.5 rounded-md p-1 hover:bg-neutral-50 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                  {userInitial}
                </div>
                <span className="hidden max-w-[120px] truncate text-sm text-neutral-700 sm:block">
                  {userName}
                </span>
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
