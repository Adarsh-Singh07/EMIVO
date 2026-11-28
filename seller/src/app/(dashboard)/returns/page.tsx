"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 15;

const STATUS_TABS = [
  "ALL",
  "REQUESTED",
  "APPROVED",
  "PICKUP_SCHEDULED",
  "RETURNED",
  "REFUNDED",
  "REJECTED",
  "CLOSED",
] as const;

const TAB_LABELS: Record<(typeof STATUS_TABS)[number], string> = {
  ALL: "All",
  REQUESTED: "Requested",
  APPROVED: "Approved",
  PICKUP_SCHEDULED: "Pickup scheduled",
  RETURNED: "Received",
  REFUNDED: "Refunded",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

const REASON_LABELS: Record<string, string> = {
  DAMAGED: "Physically damaged",
  DEFECTIVE: "Defective / not working",
  WRONG_ITEM: "Wrong item received",
  NOT_AS_DESCRIBED: "Not as described",
};

function returnTone(status: string): { tone: BadgeTone; label: string } {
  switch (status?.toUpperCase()) {
    case "REQUESTED":
      return { tone: "attention", label: "Requested" };
    case "APPROVED":
      return { tone: "progress", label: "Approved" };
    case "PICKUP_SCHEDULED":
      return { tone: "progress", label: "Pickup scheduled" };
    case "RETURNED":
      return { tone: "attention", label: "Received" };
    case "REFUNDED":
      return { tone: "accent", label: "Refunded" };
    case "REJECTED":
      return { tone: "danger", label: "Rejected" };
    case "CLOSED":
      return { tone: "neutral", label: "Closed" };
    default:
      return { tone: "neutral", label: status || "—" };
  }
}

interface SellerReturnRow {
  id: string;
  return_number: string | null;
  order_id: string;
  order_number: string | null;
  product_name: string | null;
  variant_name: string | null;
  qty: number;
  reason: string;
  customer_note: string | null;
  status: string;
  refund_amount: number;
  payment_method: string | null;
  pickup_tracking: string | null;
  resolution_note: string | null;
  customer_city: string | null;
  customer_pincode: string | null;
  requested_at: string;
}

interface SellerReturnsResponse {
  items: SellerReturnRow[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function SellerReturnsPage() {
  const [data, setData] = useState<SellerReturnsResponse | null>(null);
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
      const res = await apiClient.get<SellerReturnsResponse>(
        `/seller/return-requests?${params.toString()}`
      );
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load returns");
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

  const items = data?.items || [];
  const total = data?.total || 0;
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Returns"
        description="Track return requests, reverse pickups, and restocked refunds for your products."
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return ID, order number, or product"
            className="ex-input w-full rounded-md border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-neutral-200 bg-white p-1.5">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusTab === s
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {TAB_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No return requests"
          description={
            search || statusTab !== "ALL"
              ? "No return requests match your current filters."
              : "When customers request returns for your items, they will appear here."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Return</th>
                  <th className="px-4 py-3">Order &amp; Destination</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((r) => {
                  const st = returnTone(r.status);
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-neutral-50">
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-xs font-semibold text-neutral-900">
                          {r.return_number || r.id.slice(0, 8)}
                        </span>
                        {r.pickup_tracking && (
                          <p className="mt-0.5 font-mono text-xs text-neutral-500">
                            AWB {r.pickup_tracking}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/orders/${r.order_id}`}
                          className="font-mono text-xs font-semibold text-neutral-900 hover:text-emerald-800"
                        >
                          {r.order_number || r.order_id.slice(0, 8)}
                        </Link>
                        {(r.customer_city || r.customer_pincode) && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {[r.customer_city, r.customer_pincode].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-neutral-900">
                          {r.product_name || "Item"}
                          <span className="ml-1.5 font-mono text-xs text-neutral-500">
                            &times;{r.qty}
                          </span>
                        </p>
                        {r.variant_name && (
                          <p className="text-xs text-neutral-500">{r.variant_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-xs font-medium text-neutral-800">
                          {REASON_LABELS[r.reason] || r.reason}
                        </p>
                        {r.resolution_note && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-neutral-500" title={r.resolution_note}>
                            {r.resolution_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top font-mono text-xs font-semibold text-neutral-900">
                        {formatINR(r.refund_amount)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right align-top font-mono text-xs text-neutral-500">
                        {new Date(r.requested_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-xs text-neutral-600">
              <span>
                Page {page} of {pageCount} ({total} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
