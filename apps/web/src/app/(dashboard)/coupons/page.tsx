"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, RefreshCw, AlertCircle, Plus, Loader2, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { Pagination } from "@/components/admin/Pagination";
import { Modal } from "@/components/admin/Modal";

const PAGE_SIZE = 15;

interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  usage_count: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
}

interface CouponsPageData {
  items: Coupon[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—";

function couponValue(c: Coupon): string {
  return c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : formatINR(c.discount_value);
}

export default function CouponsPage() {
  const [data, setData] = useState<CouponsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [value, setValue] = useState(""); // percent or ₹ depending on type
  const [minOrder, setMinOrder] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<CouponsPageData>(`/coupons/?page=${page}&page_size=${PAGE_SIZE}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    try {
      await apiClient.patch(`/coupons/${coupon.id}`, { is_active: !coupon.is_active });
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)) } : prev
      );
      toast.success(`Coupon ${coupon.code} ${coupon.is_active ? "deactivated" : "activated"}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const softDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? This is a soft delete.`)) return;
    setBusyId(coupon.id);
    try {
      await apiClient.delete(`/coupons/${coupon.id}`);
      toast.success(`Coupon ${coupon.code} deleted`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const submitCreate = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error("Code is required");
      return;
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error(discountType === "PERCENTAGE" ? "Percentage must be a positive number" : "Value must be a positive ₹ amount");
      return;
    }
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        code: trimmedCode,
        discount_type: discountType,
        discount_value:
          discountType === "PERCENTAGE" ? Math.trunc(numericValue) : (rupeesToPaise(value) ?? 0),
        per_user_limit: Math.max(parseInt(perUserLimit, 10) || 1, 1),
        is_active: isActive,
      };
      const minPaise = rupeesToPaise(minOrder);
      if (minPaise != null && minPaise > 0) payload.min_order_amount = minPaise;
      const maxPaise = rupeesToPaise(maxDiscount);
      if (maxPaise != null && maxPaise > 0) payload.max_discount_amount = maxPaise;
      const ul = parseInt(usageLimit, 10);
      if (!Number.isNaN(ul) && ul > 0) payload.usage_limit = ul;
      if (startDate) payload.start_date = new Date(startDate).toISOString();
      if (endDate) payload.end_date = new Date(endDate).toISOString();

      await apiClient.post("/coupons/", payload);
      toast.success(`Coupon ${trimmedCode} created`);
      setCreateOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscountType("PERCENTAGE");
    setValue("");
    setMinOrder("");
    setMaxDiscount("");
    setUsageLimit("");
    setPerUserLimit("1");
    setStartDate("");
    setEndDate("");
    setIsActive(true);
  };

  const items = data?.items || [];
  const total = data?.total || 0;
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const inputCls =
    "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelCls = "mb-1.5 block text-sm font-semibold text-neutral-700";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <Tag className="w-8 h-8 text-amber-500" />
            Coupons
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Discount codes applied at checkout.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700"
          >
            <Plus className="h-4 w-4" />
            New Coupon
          </button>
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <Ticket className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">No coupons yet</h3>
            <p className="text-sm text-neutral-500">Create a discount code to run a promotion.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Value</th>
                  <th className="px-5 py-3.5">Min Order</th>
                  <th className="px-5 py-3.5">Max Discount</th>
                  <th className="px-5 py-3.5 text-center">Usage</th>
                  <th className="px-5 py-3.5 text-center">Per User</th>
                  <th className="px-5 py-3.5">Window</th>
                  <th className="px-5 py-3.5 text-center">Active</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-neutral-50/60">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-neutral-900">{c.code}</div>
                      {c.description && <div className="text-xs text-neutral-400">{c.description}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          c.discount_type === "PERCENTAGE"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {c.discount_type === "PERCENTAGE" ? "Percentage" : "Fixed ₹"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-neutral-900">{couponValue(c)}</td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      {c.min_order_amount ? formatINR(c.min_order_amount) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      {c.max_discount_amount ? formatINR(c.max_discount_amount) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-xs text-neutral-600">
                      {c.usage_count}
                      {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-xs text-neutral-600">{c.per_user_limit ?? "—"}</td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-neutral-400">
                      {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={busyId === c.id}
                        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                          c.is_active ? "bg-emerald-500" : "bg-neutral-200"
                        }`}
                        title={c.is_active ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                            c.is_active ? "left-[22px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => softDelete(c)}
                        disabled={busyId === c.id}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        title="Delete (soft)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create coupon"
        wide
        footer={
          <>
            <button
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Code *</label>
            <input
              className={`${inputCls} font-mono uppercase`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DIWALI20"
            />
          </div>
          <div>
            <label className={labelCls}>Type *</label>
            <select className={inputCls} value={discountType} onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_AMOUNT">Fixed amount (₹)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{discountType === "PERCENTAGE" ? "Discount percent *" : "Discount amount (₹) *"}</label>
            <div className="relative">
              {discountType === "FIXED_AMOUNT" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
              )}
              <input
                className={`${inputCls} ${discountType === "FIXED_AMOUNT" ? "pl-7" : ""}`}
                type="number"
                min="0"
                step={discountType === "PERCENTAGE" ? "1" : "0.01"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={discountType === "PERCENTAGE" ? "20" : "500"}
              />
            </div>
            {discountType === "FIXED_AMOUNT" && value && (
              <p className="mt-1 text-xs text-neutral-400">{formatINR(rupeesToPaise(value) ?? 0)} ({rupeesToPaise(value) ?? 0} paise)</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Min order (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
              <input className={`${inputCls} pl-7`} type="number" min="0" step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Max discount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
              <input className={`${inputCls} pl-7`} type="number" min="0" step="0.01" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="optional" />
            </div>
            <p className="mt-1 text-xs text-neutral-400">{discountType === "PERCENTAGE" ? "Caps percentage coupons." : "Not applicable to fixed amounts."}</p>
          </div>
          <div>
            <label className={labelCls}>Usage limit (total)</label>
            <input className={inputCls} type="number" min="1" step="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="unlimited" />
          </div>
          <div>
            <label className={labelCls}>Per-user limit</label>
            <input className={inputCls} type="number" min="1" step="1" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Start date</label>
            <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>End date</label>
            <input className={inputCls} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
              <span className="text-sm font-semibold text-neutral-700">Active immediately</span>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5 accent-amber-500" />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
