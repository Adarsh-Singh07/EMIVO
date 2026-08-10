"use client";

import {
  Settings,
  Users,
  LogOut,
  ShoppingCart,
  BarChart3,
  Package,
  ClipboardList,
  Tag,
  CreditCard,
  Layers,
  Activity,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { PageTransition } from "@/components/animations/PageTransition";
import { SmoothScrollProvider } from "@/components/animations/SmoothScrollProvider";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { BRAND_CONFIG } from "@/config/branding";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const userInitial = user?.first_name ? user.first_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : "E");
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "User";

  return (
    <SmoothScrollProvider>
      <div className="flex h-screen w-full bg-neutral-50 font-sans text-neutral-900">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 flex flex-col border-r border-neutral-200 bg-white">
          <div className="h-16 flex items-center px-6 border-b border-neutral-200">
            <Link href="/dashboard" className="flex items-center gap-3">
              <BrandLogo variant="wordmark" size={30} />
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <Link
              href="/analytics"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <BarChart3 className="w-5 h-5 text-neutral-500" />
              Analytics
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <ShoppingCart className="w-5 h-5 text-neutral-500" />
              Orders
            </Link>
            <Link
              href="/products"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <Package className="w-5 h-5 text-neutral-500" />
              Products
            </Link>
            <Link
              href="/customers"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <UserCheck className="w-5 h-5 text-neutral-500" />
              Customers
            </Link>
            <Link
              href="/businesses"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <Layers className="w-5 h-5 text-neutral-500" />
              Businesses
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <Settings className="w-5 h-5 text-neutral-500" />
              Settings
            </Link>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Control Center</p>
            </div>
            <Link
              href="/preview"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <Layers className="w-5 h-5 text-neutral-500" />
              Developer Preview
            </Link>
            <Link
              href="/health"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <Activity className="w-5 h-5 text-neutral-500" />
              System Health
            </Link>
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
              <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-neutral-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {userInitial}
                </div>
                <span className="text-sm font-medium text-neutral-700 hidden sm:block">
                  {userName}
                </span>
              </div>
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
  );
}
