"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  UserCheck,
  TrendingUp,
  Plus,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CreditCard,
  Tag,
  Boxes,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge, PaymentMethodBadge } from "@/components/admin/status-badges";
import { BRAND_CONFIG } from "@/config/branding";

interface RevenueDay {
  date: string;
  revenue_paise: number;
  orders: number;
}

interface RecentOrder {
  id: string;
  order_number: string | null;
  status: string;
  total: number;
  payment_method: string | null;
  customer_name: string | null;
  created_at: string | null;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  qty: number;
  revenue_paise: number;
}

interface DashboardStats {
  today_orders: number;
  today_revenue_paise: number;
  pending_orders: number;
  processing_orders: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_payments: number;
  total_customers: number;
  active_offers: number;
  revenue_14d: RevenueDay[];
  recent_orders: RecentOrder[];
  top_products_30d: TopProduct[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  href,
  hint,
}: {
  title: string;
  value: string | number;
  icon: typeof Package;
  iconClass: string;
  href?: string;
  hint?: string;
}) {
  const inner = (
    <Card className="bg-white border-neutral-200 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-neutral-500">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block group">
      <div className="relative">{inner}</div>
    </Link>
  ) : (
    inner
  );
}

function RevenueBars({ data }: { data: RevenueDay[] }) {
  const max = Math.max(...data.map((d) => d.revenue_paise), 1);
  return (
    <div className="flex h-44 items-end gap-1.5">
      {data.map((d) => {
        const pct = Math.max((d.revenue_paise / max) * 100, d.revenue_paise > 0 ? 3 : 1);
        return (
          <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={`w-full rounded-t-md transition-all group-hover:from-amber-500 group-hover:to-orange-500 ${
                d.revenue_paise > 0
                  ? "bg-gradient-to-t from-amber-500/70 to-orange-400/70"
                  : "bg-neutral-100"
              }`}
              style={{ height: `${pct}%` }}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
              {formatINR(d.revenue_paise)} · {d.orders} order{d.orders === 1 ? "" : "s"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<DashboardStats>("/admin/dashboard");
      setStats(data);
    } catch (err) {
      const message =
        err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "Operator";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-neutral-200 p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                Store Operations
              </span>
              <span className="text-xs text-neutral-500 font-mono">v0.2</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Welcome back, {userName}</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Here is what is happening across your {BRAND_CONFIG.name} store today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-semibold text-white hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              New Product
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {loading && !stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Today's Orders" value={stats.today_orders} icon={ShoppingCart} iconClass="text-amber-500" href="/orders" />
            <StatCard title="Today's Revenue" value={formatINR(stats.today_revenue_paise)} icon={TrendingUp} iconClass="text-emerald-600" hint="Excludes cancelled/refunded" />
            <StatCard title="Pending Orders" value={stats.pending_orders} icon={ShoppingCart} iconClass="text-amber-500" href="/orders" hint="Awaiting confirmation" />
            <StatCard title="Low Stock" value={stats.low_stock_count} icon={AlertTriangle} iconClass="text-amber-500" href="/inventory" hint="At or below threshold" />
            <StatCard title="Out of Stock" value={stats.out_of_stock_count} icon={XCircle} iconClass="text-red-500" href="/inventory" />
            <StatCard title="Pending Payments" value={stats.pending_payments} icon={CreditCard} iconClass="text-blue-500" hint="Awaiting capture" />
            <StatCard title="Active Offers" value={stats.active_offers} icon={Tag} iconClass="text-purple-500" hint="Running festival offers" />
            <StatCard title="Customers" value={stats.total_customers} icon={UserCheck} iconClass="text-amber-500" href="/customers" />
          </div>

          {/* Revenue chart + top products */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-white border-neutral-200 shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg text-neutral-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  Revenue — last 14 days
                </CardTitle>
                <CardDescription className="text-neutral-500">
                  Daily gross revenue (cancelled and refunded orders excluded).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.revenue_14d?.length ? (
                  <>
                    <RevenueBars data={stats.revenue_14d} />
                    <div className="mt-3 flex justify-between text-[10px] font-medium text-neutral-400">
                      <span>
                        {new Date(stats.revenue_14d[0].date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span>
                        {new Date(
                          stats.revenue_14d[stats.revenue_14d.length - 1].date + "T00:00:00"
                        ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-neutral-400">No revenue data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-neutral-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  Top Products
                </CardTitle>
                <CardDescription className="text-neutral-500">Units sold in the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.top_products_30d?.length ? (
                  stats.top_products_30d.slice(0, 6).map((p) => {
                    const maxRev = stats.top_products_30d[0].revenue_paise || 1;
                    return (
                      <Link key={p.product_id} href={`/products/${p.product_id}`} className="group block">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-neutral-700 group-hover:text-amber-600 transition-colors">
                            {p.product_name}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900 whitespace-nowrap">
                            {formatINR(p.revenue_paise)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                              style={{ width: `${Math.max((p.revenue_paise / maxRev) * 100, 3)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap">{p.qty} sold</span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-neutral-400">No product sales in the last 30 days.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent orders */}
          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-neutral-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-amber-500" />
                  Recent Orders
                </CardTitle>
                <CardDescription className="text-neutral-500">The 10 most recent orders across the store.</CardDescription>
              </div>
              <Link
                href="/orders"
                className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                View all <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {stats.recent_orders?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-y border-neutral-200 bg-neutral-50/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      <tr>
                        <th className="px-6 py-3">Order</th>
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3 text-right">Total</th>
                        <th className="px-6 py-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {stats.recent_orders.map((o) => (
                        <tr key={o.id} className="transition-colors hover:bg-neutral-50/60">
                          <td className="px-6 py-3.5 font-mono text-xs">
                            <Link href={`/orders/${o.id}`} className="font-semibold text-neutral-900 hover:text-amber-600">
                              {o.order_number || o.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-6 py-3.5 text-neutral-600">{o.customer_name || "—"}</td>
                          <td className="px-6 py-3.5">
                            <OrderStatusBadge status={o.status} />
                          </td>
                          <td className="px-6 py-3.5">
                            <PaymentMethodBadge method={o.payment_method} />
                          </td>
                          <td className="px-6 py-3.5 text-right font-semibold text-neutral-900">
                            {formatINR(o.total)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-xs text-neutral-400">
                            {o.created_at ? new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-neutral-400">No orders yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
