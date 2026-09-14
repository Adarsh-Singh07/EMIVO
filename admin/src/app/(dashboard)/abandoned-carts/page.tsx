"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Timer,
  RefreshCw,
  AlertCircle,
  BellRing,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";

interface AbandonedCartItem {
  name: string;
  quantity: number;
  unit_price: number;
}

interface AbandonedCart {
  id: string;
  customer_name: string | null;
  email: string | null;
  is_guest: boolean;
  subtotal: number;
  items: AbandonedCartItem[];
  updated_at: string;
}

/** "42m ago" style relative time. */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<AbandonedCart[]>(`/admin/abandoned-carts?minutes=${minutes}`);
      setCarts(data);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load abandoned carts");
    } finally {
      setLoading(false);
    }
  }, [minutes]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const nudge = async (c: AbandonedCart) => {
    if (!window.confirm(`Send a cart reminder email to ${c.email}?`)) return;
    setBusyId(c.id);
    try {
      await apiClient.post(`/admin/abandoned-carts/${c.id}/nudge`, {});
      toast.success(`Reminder queued for ${c.email}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.info("This cart was nudged recently — at most one nudge per 6 hours.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Failed to send nudge");
      }
    } finally {
      setBusyId(null);
    }
  };

  const totalValue = carts.reduce((s, c) => s + c.subtotal, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <Timer className="w-8 h-8 text-amber-500" />
            Abandoned Carts
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Carts idle with items still in them. Send a gentle reminder before the stock moves on.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            Idle for
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
              <option value={180}>3 hours</option>
              <option value={1440}>1 day</option>
            </select>
          </label>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {!loading && carts.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-xl border border-neutral-200 bg-white px-4 py-2 font-semibold text-neutral-700">
            {carts.length} cart{carts.length !== 1 ? "s" : ""}
          </span>
          <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 font-semibold text-amber-700">
            {formatINR(totalValue)} left on the table
          </span>
        </div>
      )}

      {loading && carts.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : carts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Nothing abandoned right now</h3>
            <p className="text-sm text-neutral-500">
              No carts idle for {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`} with items in them.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5">Value</th>
                  <th className="px-5 py-3.5">Idle</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {carts.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-neutral-50/60">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-neutral-900">
                        {c.customer_name || (c.is_guest ? "Guest" : "Customer")}
                      </div>
                      <div className="text-xs text-neutral-400">{c.email || "no email (guest session)"}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-neutral-700" title={c.items.map((i) => i.name).join(", ")}>
                        {c.items.reduce((s, i) => s + i.quantity, 0)} item
                        {c.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                        <span className="text-neutral-400"> · {c.items.length} product{c.items.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="text-xs text-neutral-400 truncate max-w-[240px]">
                        {c.items.map((i) => i.name).join(", ")}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-neutral-900">{formatINR(c.subtotal)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-500">{ago(c.updated_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => nudge(c)}
                        disabled={busyId === c.id || c.is_guest || !c.email}
                        title={c.is_guest || !c.email ? "Guest carts have no email to nudge" : "Send reminder email"}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                        Nudge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
