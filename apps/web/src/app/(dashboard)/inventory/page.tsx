"use client";

import { useState, useEffect, useCallback } from "react";
import { Boxes, Search, RefreshCw, AlertCircle, History, PackageX, TrendingDown } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { StockBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/admin/Pagination";
import { Modal, Drawer } from "@/components/admin/Modal";

const PAGE_SIZE = 20;

type AdjustMode = "set" | "delta" | "restock" | "damage" | "return";

interface InventoryRow {
  product_id: string;
  product_name: string | null;
  product_sku: string | null;
  on_hand: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

interface InventoryList {
  items: InventoryRow[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

interface Movement {
  id: string;
  product_id: string;
  order_id: string | null;
  delta_on_hand: number;
  delta_reserved: number;
  on_hand_after: number;
  reserved_after: number;
  reason: string;
  note: string | null;
  actor_id: string | null;
  created_at: string;
}

const ADJUST_MODES: Array<{ value: AdjustMode; label: string; help: string }> = [
  { value: "set", label: "Set", help: "Set on-hand to an absolute value" },
  { value: "restock", label: "Restock", help: "Add units to on-hand" },
  { value: "delta", label: "Adjust +", help: "Apply a positive on-hand correction" },
  { value: "damage", label: "Damage", help: "Write off damaged units" },
  { value: "return", label: "Return", help: "Return units to stock" },
];

function reasonTone(reason: string): string {
  switch (reason) {
    case "restock":
    case "return":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "damage":
      return "bg-red-50 text-red-600 border-red-200";
    case "order":
    case "order_reserve":
    case "order_release":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
  }
}

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [page, setPage] = useState(1);

  // Adjust modal state
  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>("restock");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustThreshold, setAdjustThreshold] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Movements drawer state
  const [movementsFor, setMovementsFor] = useState<InventoryRow | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (search.trim()) params.set("q", search.trim());
      if (filter === "low") params.set("low_stock", "true");
      if (filter === "out") params.set("out_of_stock", "true");
      const data = await apiClient.get<InventoryList>(`/inventory?${params.toString()}`);
      setRows(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const openAdjust = (row: InventoryRow) => {
    setAdjustRow(row);
    setAdjustMode("restock");
    setAdjustValue("");
    setAdjustNote("");
    setAdjustThreshold(String(row.low_stock_threshold ?? ""));
  };

  const submitAdjust = async () => {
    if (!adjustRow) return;
    const raw = adjustValue.trim();
    const value = Number(raw);
    if (raw === "" || !Number.isFinite(value) || value < 0) {
      alert("Enter a non-negative numeric value (the mode decides the direction)");
      return;
    }
    setAdjusting(true);
    try {
      const payload: Record<string, unknown> = { mode: adjustMode, value: Math.trunc(value) };
      if (adjustNote.trim()) payload.note = adjustNote.trim();
      const threshold = adjustThreshold.trim();
      if (threshold !== "") payload.low_stock_threshold = Math.max(Math.trunc(Number(threshold)), 0);
      await apiClient.post(`/inventory/${adjustRow.product_id}/adjust`, payload);
      setAdjustRow(null);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  };

  const openMovements = async (row: InventoryRow) => {
    setMovementsFor(row);
    setMovements([]);
    setMovementsLoading(true);
    try {
      const data = await apiClient.get<{ items: Movement[] }>(`/inventory/movements?product_id=${row.product_id}&limit=100`);
      setMovements(data?.items || []);
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <Boxes className="w-8 h-8 text-amber-500" />
            Inventory
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Live stock levels, thresholds and movement history.</p>
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {(
            [
              { key: "all", label: "All items", icon: Boxes },
              { key: "low", label: "Low stock", icon: TrendingDown },
              { key: "out", label: "Out of stock", icon: PackageX },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                filter === key
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
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
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <Boxes className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">No inventory records</h3>
            <p className="text-sm text-neutral-500">
              {search || filter !== "all" ? "Nothing matches the current filters." : "Inventory appears once products have stock."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5 text-right">On Hand</th>
                  <th className="px-5 py-3.5 text-right">Reserved</th>
                  <th className="px-5 py-3.5 text-right">Available</th>
                  <th className="px-5 py-3.5 text-right">Threshold</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => (
                  <tr key={row.product_id} className="transition-colors hover:bg-neutral-50/60">
                    <td className="px-5 py-3.5 font-semibold text-neutral-900">{row.product_name || "—"}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-500">{row.product_sku || "—"}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-neutral-700">{row.on_hand}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-neutral-400">{row.reserved}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-neutral-900">{row.available}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-400">{row.low_stock_threshold}</td>
                    <td className="px-5 py-3.5">
                      <StockBadge available={row.available} isLowStock={row.is_low_stock} isOutOfStock={row.is_out_of_stock} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openMovements(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
                        >
                          <History className="h-3.5 w-3.5" /> Movements
                        </button>
                        <button
                          onClick={() => openAdjust(row)}
                          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
        </div>
      )}

      {/* Adjust modal */}
      <Modal
        open={!!adjustRow}
        onClose={() => setAdjustRow(null)}
        title={`Adjust stock — ${adjustRow?.product_name || ""}`}
        footer={
          <>
            <button
              onClick={() => setAdjustRow(null)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitAdjust}
              disabled={adjusting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
            >
              {adjusting && <RefreshCw className="h-4 w-4 animate-spin" />}
              Apply
            </button>
          </>
        }
      >
        {adjustRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-3 text-center text-xs">
              <div>
                <p className="text-neutral-400">On hand</p>
                <p className="font-mono text-sm font-bold text-neutral-900">{adjustRow.on_hand}</p>
              </div>
              <div>
                <p className="text-neutral-400">Reserved</p>
                <p className="font-mono text-sm font-bold text-neutral-900">{adjustRow.reserved}</p>
              </div>
              <div>
                <p className="text-neutral-400">Available</p>
                <p className="font-mono text-sm font-bold text-emerald-600">{adjustRow.available}</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {ADJUST_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setAdjustMode(m.value)}
                    title={m.help}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                      adjustMode === m.value
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-neutral-400">{ADJUST_MODES.find((m) => m.value === adjustMode)?.help}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Value</label>
                <input
                  type="number"
                  step="1"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  placeholder="e.g. 10 (magnitude)"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Low-stock threshold</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={adjustThreshold}
                  onChange={(e) => setAdjustThreshold(e.target.value)}
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Note (optional)</label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="e.g. weekly restock from supplier"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Movements drawer */}
      <Drawer open={!!movementsFor} onClose={() => setMovementsFor(null)} title={`Movements — ${movementsFor?.product_name || ""}`}>
        {movementsLoading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : movements.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">No stock movements recorded for this product yet.</p>
        ) : (
          <ul className="space-y-3">
            {movements.map((m) => (
              <li key={m.id} className="rounded-xl border border-neutral-200 bg-white p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${reasonTone(m.reason)}`}>
                    {m.reason.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-400">
                    {new Date(m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-neutral-600">
                  <span>
                    Δ on-hand{" "}
                    <span className={m.delta_on_hand > 0 ? "text-emerald-600" : m.delta_on_hand < 0 ? "text-red-500" : "text-neutral-400"}>
                      {m.delta_on_hand > 0 ? "+" : ""}
                      {m.delta_on_hand}
                    </span>
                  </span>
                  <span>
                    Δ reserved{" "}
                    <span className={m.delta_reserved > 0 ? "text-amber-600" : m.delta_reserved < 0 ? "text-blue-600" : "text-neutral-400"}>
                      {m.delta_reserved > 0 ? "+" : ""}
                      {m.delta_reserved}
                    </span>
                  </span>
                  <span className="text-neutral-400">→ on-hand {m.on_hand_after}</span>
                </div>
                {m.note && <p className="mt-1.5 text-xs italic text-neutral-500">“{m.note}”</p>}
                {m.order_id && <p className="mt-1 font-mono text-[10px] text-neutral-400">order {m.order_id.slice(0, 8)}</p>}
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </div>
  );
}
