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
} from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { PageTransition } from "@/components/animations/PageTransition";
import { SmoothScrollProvider } from "@/components/animations/SmoothScrollProvider";
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

function NotificationBell() {
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ unread_count?: number }>("/notifications?unread_only=true&limit=1")
      .then((data) => {
        if (!cancelled) setUnread(data?.unread_count ?? 0);
      })
      .catch(() => {
        // Non-critical; leave the bell quiet when unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="relative inline-flex items-center justify-center rounded-xl p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 transition-colors">
      <Bell className="h-5 w-5" />
      {unread !== null && unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </span>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const userInitial = user?.first_name ? user.first_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : "E");
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "User";

  return (
    <AuthGuard requiredRoles={[...ADMIN_ROLES]}>
      <SmoothScrollProvider>
        <div className="flex h-screen w-full bg-neutral-50 font-sans text-neutral-900">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 flex flex-col border-r border-neutral-200 bg-white">
            <div className="h-16 flex items-center px-6 border-b border-neutral-200">
              <Link href="/dashboard" className="flex items-center gap-3">
                <BrandLogo variant="wordmark" size={30} />
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
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
            <div className="p-4 border-t border-neutral-200">
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
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Topbar */}
            <header className="h-16 flex-shrink-0 border-b border-neutral-200 bg-white flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
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
            <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/50">
              <div className="mx-auto max-w-6xl">
                <PageTransition>{children}</PageTransition>
              </div>
            </div>
          </main>
        </div>
      </SmoothScrollProvider>
    </AuthGuard>
  );
}
