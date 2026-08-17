"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShoppingBag, RefreshCw, AlertCircle, Search } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/admin/Pagination";

const PAGE_SIZE = 15;

const STATUS_TABS = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;

interface OrderRow {
  id: string;
  order_number: string | null;
  status: string;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  items?: Array<{ product_name: string; quantity: number }>;
  shipping_address?: Record<string, unknown> | null;
}

interface OrdersPageData {
  items: OrderRow[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

function customerName(order: OrderRow): string {
  const addr = order.shipping_address as { full_name?: string; name?: string } | null | undefined;
  return addr?.full_name || addr?.name || "—";
}

export default function OrdersPage() {
  const [data, setData] = useState<OrdersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (statusTab !== "ALL") params.set("status", statusTab);
      if (search.trim()) params.set("q", search.trim());
      const res = await apiClient.get<OrdersPageData>(`/orders?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, statusTab, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  const total = data?.total || 0;
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const items = data?.items || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-amber-500" />
            Orders
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Process orders through the fulfilment state machine.</p>
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

      {/* Search + status tabs */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number (e.g. ELK-...)"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-1.5">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusTab(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusTab === s ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">No orders found</h3>
            <p className="text-sm text-neutral-500">
              {search || statusTab !== "ALL" ? "Nothing matches the current filters." : "Orders placed via checkout will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5 text-right">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-neutral-50/60">
                    <td className="px-5 py-3.5 font-mono text-xs">
                      <Link href={`/orders/${order.id}`} className="font-semibold text-neutral-900 hover:text-amber-600">
                        {order.order_number || order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">{customerName(order)}</td>
                    <td className="px-5 py-3.5">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <PaymentMethodBadge method={order.payment_method} />
                        {order.payment_status && <PaymentStatusBadge status={order.payment_status} />}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-neutral-900">{formatINR(order.total)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-400">
                      {new Date(order.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
