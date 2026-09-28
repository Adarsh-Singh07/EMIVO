new_page = '''"use client";

/**
 * ELEKTRIX Admin - operations landing. Replaces the old marketing hero
 * with live store vitals (when signed in) and paths into every section.
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

const inr = (paise: number) => "\\u20B9" + (paise / 100).toLocaleString("en-IN");

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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-amber-50/60 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <BrandLogo variant="wordmark" height={30} showText={false} />
          <div className="flex items-center gap-3">
            {authed === false && (
              <>
                <Link href="/login" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                  Sign In
                </Link>
                <Link href="/dashboard" className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">
                  Open Dashboard <ArrowRight className="ml-1 inline h-4 w-4" />
                </Link>
              </>
            )}
            {authed === true && (
              <Link href="/dashboard" className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">
                Go to Dashboard <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            )}
          </div>
        </header>

        <section className="mt-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">ELEKTRIX Operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Run the store.
          </h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Everything behind elektrix.in - orders, inventory, customers, offers and support -
            in one place. {authed === true ? "Live vitals below." : "Sign in with your staff account to see live vitals."}
          </p>
        </section>

        {authed === true && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Today at a glance</h2>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {vitals.map((v) => (
                <Link key={v.label} href={v.href} className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{v.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${v.warn ? "text-red-600" : "text-neutral-900"}`}>
                    {v.value}
                    {v.warn && <ShieldAlert className="ml-1 inline h-4 w-4" />}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">All sections</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map(({ href, label, desc, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md"
              >
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-sm font-bold text-neutral-900">
                    {label}
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-amber-500" />
                  </p>
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
'''
io_open = __import__("io").open
io_open("admin/src/app/page.tsx", "w", encoding="utf-8", newline="\n").write(new_page)
print("home page replaced")
