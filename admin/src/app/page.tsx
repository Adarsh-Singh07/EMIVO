"use client";

/**
 * ELEKTRIX Admin — operations landing with live store vitals (when signed in)
 * and paths into every section.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Warehouse, LifeBuoy,
  TicketPercent, Megaphone, BarChart3, Truck, ShieldAlert, Settings,
  ArrowRight, RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { BrandLogo } from "@/components/branding/BrandLogo";

type Stats = {
  today_orders: number;
  today_revenue_paise: number;
  pending_orders: number;
  processing_orders: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_payments: number;
  total_customers: number;
  active_offers: number;
};

const inr = (paise: number) => "\u20B9" + (paise / 100).toLocaleString("en-IN");

const SECTIONS = [
  { href: "/dashboard", label: "Dashboard", desc: "Sales, revenue and order trends", Icon: LayoutDashboard },
  { href: "/orders", label: "Orders", desc: "Fulfil, ship and track customer orders", Icon: ShoppingCart },
  { href: "/products", label: "Products", desc: "Catalog, pricing and media", Icon: Package },
  { href: "/inventory", label: "Inventory", desc: "Stock levels and restocks", Icon: Warehouse },
  { href: "/customers", label: "Customers", desc: "Accounts, orders and payments", Icon: Users },
  { href: "/support", label: "Support", desc: "Tickets and customer conversations", Icon: LifeBuoy },
  { href: "/coupons", label: "Coupons", desc: "Discounts and festive offers", Icon: TicketPercent },
  { href: "/broadcasts", label: "Broadcasts", desc: "Email campaigns to customers", Icon: Megaphone },
  { href: "/analytics", label: "Analytics", desc: "Performance and trends", Icon: BarChart3 },
  { href: "/abandoned-carts", label: "Abandoned Carts", desc: "Recover incomplete checkouts", Icon: Truck },
  { href: "/settings", label: "Settings", desc: "Store, shipping and payments", Icon: Settings },
];

export default function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Stats>("/admin/dashboard");
      setStats(data);
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const vitals = stats
    ? [
        { label: "Orders today", value: String(stats.today_orders), href: "/orders", warn: false },
        { label: "Revenue today", value: inr(stats.today_revenue_paise), href: "/analytics", warn: false },
        { label: "Pending fulfilment", value: String(stats.pending_orders + stats.processing_orders), href: "/orders", warn: false },
        { label: "Needs restock", value: String(stats.low_stock_count + stats.out_of_stock_count), href: "/inventory", warn: stats.out_of_stock_count > 0 },
        { label: "Customers", value: String(stats.total_customers), href: "/customers", warn: false },
        { label: "Active offers", value: String(stats.active_offers), href: "/coupons", warn: false },
      ]
    : [];

  return (
    <div className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <BrandLogo size={30} showText={false} />
          <div className="flex items-center gap-2">
            {authed === false && (
              <>
                <Link href="/login" className="rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
                  Sign in
                </Link>
                <Link href="/dashboard" className="rounded-md border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-700">
                  Open dashboard <ArrowRight className="ml-1 inline h-4 w-4" />
                </Link>
              </>
            )}
            {authed === true && (
              <Link href="/dashboard" className="rounded-md border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-700">
                Go to dashboard <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            )}
          </div>
        </header>

        <section className="mt-12">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Run the store.
          </h1>
          <p className="mt-2 max-w-2xl text-neutral-600">
            Everything behind elektrix.in — orders, inventory, customers, offers and support —
            in one place. {authed === true ? "Live numbers below." : "Sign in with your staff account to see live numbers."}
          </p>
        </section>

        {authed === true && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">Today at a glance</h2>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {vitals.map((v) => (
                <Link key={v.label} href={v.href} className="rounded-md border border-neutral-200 bg-white p-4 hover:border-neutral-300">
                  <p className="text-xs text-neutral-500">{v.label}</p>
                  <p className={`mt-1 text-xl font-semibold ${v.warn ? "text-red-600" : "text-neutral-900"}`}>
                    {v.value}
                    {v.warn && <ShieldAlert className="ml-1 inline h-4 w-4" />}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-base font-semibold text-neutral-900">All sections</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map(({ href, label, desc, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-start gap-3 rounded-md border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:bg-neutral-50"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{label}</p>
                  <p className="truncate text-xs text-neutral-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400">
          ELEKTRIX · M/S APANA ENTERPRISES · elektrix.in
        </footer>
      </div>
    </div>
  );
}
