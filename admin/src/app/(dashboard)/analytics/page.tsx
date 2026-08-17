"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw, AlertCircle, TrendingUp, Package, Users, ShoppingBag } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";

interface RevenueDay {
  date: string;
  revenue_paise: number;
  orders: number;
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
  top_products_30d: TopProduct[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<DashboardStats>("/admin/dashboard");
      setStats(data);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revenue14 = stats?.revenue_14d || [];
  const maxRevenue = Math.max(...revenue14.map((d) => d.revenue_paise), 1);
  const total14 = revenue14.reduce((acc, d) => acc + d.revenue_paise, 0);
  const orders14 = revenue14.reduce((acc, d) => acc + d.orders, 0);
  const activeDays = revenue14.filter((d) => d.orders > 0).length;
  const topProducts = stats?.top_products_30d || [];
  const maxProductRevenue = Math.max(...topProducts.map((p) => p.revenue_paise), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-amber-500" />
            Analytics
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Store performance from live order data.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {loading && !stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* KPI row — derived from the 14-day window */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Revenue (14 days)</p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900">{formatINR(total14)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-400">{activeDays} of 14 days with orders</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Orders (14 days)</p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900">{orders14.toLocaleString("en-IN")}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-400">
                {stats.today_orders} today · {stats.pending_orders} pending
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Customers</p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900">{stats.total_customers.toLocaleString("en-IN")}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-400">Registered customer records</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Stock Alerts</p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900">
                    {stats.low_stock_count + stats.out_of_stock_count}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Package className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-400">
                {stats.low_stock_count} low · {stats.out_of_stock_count} out of stock
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Revenue bar chart */}
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm lg:col-span-2">
              <div className="border-b border-neutral-200 p-5">
                <h2 className="font-bold text-neutral-900">Revenue — last 14 days</h2>
                <p className="text-xs text-neutral-400">Daily totals; cancelled/refunded orders excluded.</p>
              </div>
              <div className="p-5">
                {revenue14.length ? (
                  <>
                    <div className="flex h-56 items-end gap-1.5">
                      {revenue14.map((d) => {
                        const pct = Math.max((d.revenue_paise / maxRevenue) * 100, d.revenue_paise > 0 ? 3 : 1);
                        return (
                          <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                            <div
                              className={`w-full rounded-t-md bg-gradient-to-t from-amber-500/70 to-orange-400/70 transition-opacity group-hover:from-amber-500 group-hover:to-orange-500 ${
                                d.revenue_paise === 0 ? "!bg-neutral-100" : ""
                              }`}
                              style={{ height: `${pct}%` }}
                            />
                            <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                              {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
                              {formatINR(d.revenue_paise)} · {d.orders} order{d.orders === 1 ? "" : "s"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-between text-[10px] font-medium text-neutral-400">
                      <span>
                        {new Date(revenue14[0].date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <span>
                        {new Date(revenue14[revenue14.length - 1].date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="py-16 text-center text-sm text-neutral-400">No revenue data yet.</p>
                )}
              </div>
            </div>

            {/* Top products list */}
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 p-5">
                <h2 className="font-bold text-neutral-900">Top Products (30 days)</h2>
                <p className="text-xs text-neutral-400">By revenue.</p>
              </div>
              <div className="p-5">
                {topProducts.length ? (
                  <ul className="space-y-4">
                    {topProducts.map((p, i) => (
                      <li key={p.product_id}>
                        <Link href={`/products/${p.product_id}`} className="group block">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-neutral-700 group-hover:text-amber-600">
                              <span className="mr-1.5 font-mono text-[10px] text-neutral-400">#{i + 1}</span>
                              {p.product_name}
                            </span>
                            <span className="whitespace-nowrap text-xs font-semibold text-neutral-900">{formatINR(p.revenue_paise)}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                                style={{ width: `${Math.max((p.revenue_paise / maxProductRevenue) * 100, 3)}%` }}
                              />
                            </div>
                            <span className="whitespace-nowrap text-[10px] text-neutral-400">{p.qty} sold</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-12 text-center text-sm text-neutral-400">No product sales in the last 30 days.</p>
                )}
              </div>
            </div>
          </div>

          {/* Top products table */}
          {topProducts.length ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-4">
                <h2 className="font-bold text-neutral-900">Product Performance (30 days)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    <tr>
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3 text-right">Units Sold</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                      <th className="px-5 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {topProducts.map((p, i) => (
                      <tr key={p.product_id} className="transition-colors hover:bg-neutral-50/60">
                        <td className="px-5 py-3.5 font-mono text-xs text-neutral-400">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <Link href={`/products/${p.product_id}`} className="font-semibold text-neutral-900 hover:text-amber-600">
                            {p.product_name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-neutral-700">{p.qty}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-neutral-900">{formatINR(p.revenue_paise)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-400">
                          {((p.revenue_paise / maxProductRevenue) * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
