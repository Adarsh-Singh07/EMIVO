"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Search, RotateCcw, CheckCircle2, XCircle, Truck, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { ReturnStatusBadge, RETURN_REASON_LABELS, PaymentMethodBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/admin/Pagination";
import { Modal } from "@/components/admin/Modal";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
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

interface ReturnRequestRow {
  id: string;
  return_number: string | null;
  order_id: string;
  order_number: string | null;
  order_item_id: string;
  seller_id: string | null;
  seller_name: string | null;
  product_id: string | null;
  product_name: string | null;
  variant_name: string | null;
  unit_price: number | null;
  qty: number;
  reason: string;
  customer_note: string | null;
  status: string;
  refund_amount: number;
  payment_method: string | null;
  resolution_note: string | null;
  pickup_tracking: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_city: string | null;
  requested_at: string;
}

interface ReturnsPageData {
  items: ReturnRequestRow[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

type ModalMode = "approve" | "reject" | "pickup" | "receive" | "refund" | "close";

export default function ReturnsPage() {
  const [data, setData] = useState<ReturnsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [activeRow, setActiveRow] = useState<ReturnRequestRow | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [refundRupeesInput, setRefundRupeesInput] = useState("");
  const [pickupAwbInput, setPickupAwbInput] = useState("");
  const [issueRefundToggle, setIssueRefundToggle] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (statusTab !== "ALL") params.set("status", statusTab);
      if (search.trim()) params.set("q", search.trim());
      const res = await apiClient.get<ReturnsPageData>(`/admin/return-requests?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load return requests");
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

  const openModal = (row: ReturnRequestRow, mode: ModalMode) => {
    setActiveRow(row);
    setModalMode(mode);
    setNoteInput(row.resolution_note || "");
    setRefundRupeesInput(row.refund_amount ? String(row.refund_amount / 100) : "");
    setPickupAwbInput(row.pickup_tracking || "");
    setIssueRefundToggle(true);
  };

  const closeModal = () => {
    setActiveRow(null);
    setModalMode(null);
    setNoteInput("");
    setRefundRupeesInput("");
    setPickupAwbInput("");
  };

  const parsePaise = (): number | undefined => {
    if (!refundRupeesInput.trim()) return undefined;
    const val = parseFloat(refundRupeesInput.replace(/[₹,\s]/g, ""));
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Refund amount must be a valid non-negative rupee amount");
      throw new Error("invalid_amount");
    }
    return Math.round(val * 100);
  };

  const submitAction = async () => {
    if (!activeRow || !modalMode) return;
    let endpoint = "";
    const payload: Record<string, unknown> = {};

    try {
      if (modalMode === "approve") {
        endpoint = `/admin/return-requests/${activeRow.id}/approve`;
        const paise = parsePaise();
        if (paise !== undefined) payload.refund_amount = paise;
        if (noteInput.trim()) payload.resolution_note = noteInput.trim();
      } else if (modalMode === "reject") {
        if (noteInput.trim().length < 3) {
          toast.error("Please provide a rejection reason (at least 3 characters)");
          return;
        }
        endpoint = `/admin/return-requests/${activeRow.id}/reject`;
        payload.resolution_note = noteInput.trim();
      } else if (modalMode === "pickup") {
        endpoint = `/admin/return-requests/${activeRow.id}/schedule-pickup`;
        if (pickupAwbInput.trim()) payload.pickup_tracking = pickupAwbInput.trim();
        if (noteInput.trim()) payload.resolution_note = noteInput.trim();
      } else if (modalMode === "receive") {
        endpoint = `/admin/return-requests/${activeRow.id}/mark-received`;
        payload.issue_refund = issueRefundToggle;
        const paise = parsePaise();
        if (paise !== undefined) payload.refund_amount = paise;
        if (noteInput.trim()) payload.resolution_note = noteInput.trim();
      } else if (modalMode === "refund") {
        endpoint = `/admin/return-requests/${activeRow.id}/refund`;
        const paise = parsePaise();
        if (paise !== undefined) payload.refund_amount = paise;
        if (noteInput.trim()) payload.resolution_note = noteInput.trim();
      } else if (modalMode === "close") {
        endpoint = `/admin/return-requests/${activeRow.id}/close`;
        if (noteInput.trim()) payload.resolution_note = noteInput.trim();
      }
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(endpoint, payload);
      toast.success(
        modalMode === "approve"
          ? "Return approved"
          : modalMode === "reject"
            ? "Return rejected"
            : modalMode === "pickup"
              ? "Reverse pickup scheduled"
              : modalMode === "receive"
                ? issueRefundToggle
                  ? "Return received & refund processed"
                  : "Return marked as received"
                : modalMode === "refund"
                  ? "Refund processed"
                  : "Return closed"
      );
      closeModal();
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const total = data?.total || 0;
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const items = data?.items || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Returns & Refunds"
        description="Review 7-day post-delivery return requests, coordinate reverse pickups, and issue refunds."
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Search + status filter tabs */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return ID, order number, product, or customer"
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No return requests"
          description={
            search || statusTab !== "ALL"
              ? "No return requests match your current filters."
              : "Customer and admin-initiated return requests will appear here."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Return</th>
                  <th className="px-4 py-3">Order &amp; Customer</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Refund</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Requested</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((r) => (
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
                      <p className="mt-0.5 text-xs text-neutral-700">
                        {r.customer_name || r.customer_email || "Customer"}
                      </p>
                      {r.payment_method && (
                        <div className="mt-1">
                          <PaymentMethodBadge method={r.payment_method} />
                        </div>
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
                      {r.seller_name && (
                        <p className="text-xs text-neutral-500">Seller: {r.seller_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs font-medium text-neutral-800">
                        {RETURN_REASON_LABELS[r.reason] || r.reason}
                      </p>
                      {r.customer_note && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-neutral-500" title={r.customer_note}>
                          {r.customer_note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono text-xs font-semibold text-neutral-900">
                      {formatINR(r.refund_amount)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ReturnStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono text-xs text-neutral-500">
                      {new Date(r.requested_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {r.status === "REQUESTED" && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => openModal(r, "approve")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openModal(r, "reject")}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === "APPROVED" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openModal(r, "pickup")}
                            >
                              <Truck className="h-3.5 w-3.5" />
                              Schedule pickup
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => openModal(r, "receive")}
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              Mark received
                            </Button>
                          </>
                        )}
                        {r.status === "PICKUP_SCHEDULED" && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openModal(r, "receive")}
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            Mark received
                          </Button>
                        )}
                        {r.status === "RETURNED" && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openModal(r, "refund")}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Issue refund
                          </Button>
                        )}
                        {r.status !== "CLOSED" && r.status !== "REQUESTED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openModal(r, "close")}
                          >
                            Close
                          </Button>
                        )}
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

      <Modal
        open={!!activeRow && !!modalMode}
        onClose={closeModal}
        title={
          modalMode === "approve"
            ? "Approve return request"
            : modalMode === "reject"
              ? "Reject return request"
              : modalMode === "pickup"
                ? "Schedule reverse pickup"
                : modalMode === "receive"
                  ? "Mark returned item received"
                  : modalMode === "refund"
                    ? "Issue return refund"
                    : "Close return request"
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant={modalMode === "reject" ? "danger" : "primary"}
              onClick={submitAction}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Confirm"}
            </Button>
          </>
        }
      >
        {activeRow && (
          <div className="space-y-4">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
              <p className="font-mono font-semibold text-neutral-900">
                {activeRow.return_number} &middot; {activeRow.order_number}
              </p>
              <p className="mt-1">
                {activeRow.product_name} &times; {activeRow.qty} &middot;{" "}
                {RETURN_REASON_LABELS[activeRow.reason] || activeRow.reason}
              </p>
              {activeRow.customer_note && (
                <p className="mt-1 text-neutral-500">Customer: &ldquo;{activeRow.customer_note}&rdquo;</p>
              )}
            </div>

            {modalMode === "pickup" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                  Reverse pickup AWB / tracking ID (optional)
                </label>
                <input
                  value={pickupAwbInput}
                  onChange={(e) => setPickupAwbInput(e.target.value)}
                  placeholder="e.g. DLV-RET-998811"
                  className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
                />
              </div>
            )}

            {(modalMode === "approve" || modalMode === "receive" || modalMode === "refund") && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                  Refund amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundRupeesInput}
                  onChange={(e) => setRefundRupeesInput(e.target.value)}
                  className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
                />
              </div>
            )}

            {modalMode === "receive" && (
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={issueRefundToggle}
                  onChange={(e) => setIssueRefundToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                Issue refund and restock returned quantity immediately
              </label>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                {modalMode === "reject" ? "Rejection reason (sent to customer)" : "Resolution note (optional)"}
              </label>
              <textarea
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  modalMode === "reject"
                    ? "Explain why this return request cannot be accepted"
                    : "Internal or customer-facing note"
                }
                className="w-full rounded-md border border-neutral-200 bg-white p-2.5 text-sm text-neutral-900 placeholder-neutral-400"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
