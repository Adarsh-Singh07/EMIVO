"use client";

import { useCallback, useEffect, useState } from"react";
import Link from"next/link";
import {
 CheckCircle2,
 XCircle,
 RefreshCw,
 Clock,
 Store,
 Package,
 ArrowRight,
 AlertCircle,
} from"lucide-react";
import { apiClient, ApiError } from"@/lib/api-client";
import { toast } from"sonner";

/**
 * Seller-proposed catalog edits. Sellers can always change their own price and
 * stock; anything that touches the shared ELEKTRIX catalog lands here first.
 */
interface ChangeRequest {
 id: string;
 product_id: string;
 product_name?: string | null;
 product_sku?: string | null;
 requested_by_seller_id: string;
 seller_name?: string | null;
 changes: Record<string, unknown>;
 status: string;
 review_note?: string | null;
 reviewed_by_email?: string | null;
 reviewed_at?: string | null;
 created_at?: string | null;
 current_values?: Record<string, unknown> | null;
}

const FIELD_LABELS: Record<string, string> = {
 name:"Product title",
 brand:"Brand",
 category_id:"Category",
 description:"Description",
 warranty_info:"Warranty",
 return_policy:"Return policy",
 specs:"Specifications",
 images:"Images",
 status:"Listing status",
};

const STATUS_STYLES: Record<string, string> = {
 PENDING:"bg-amber-50 text-amber-800 border-amber-200",
 APPROVED:"bg-emerald-50 text-emerald-800 border-emerald-200",
 REJECTED:"bg-red-50 text-red-700 border-red-200",
 WITHDRAWN:"bg-neutral-100 text-neutral-600 border-neutral-200",
};

function formatDate(value?: string | null): string {
 if (!value) return"—";
 const d = new Date(value);
 if (Number.isNaN(d.getTime())) return"—";
 return d.toLocaleString("en-IN", {
 day:"2-digit",
 month:"short",
 year:"numeric",
 hour:"2-digit",
 minute:"2-digit",
 });
}

/** Render an arbitrary catalog value as readable text. */
function renderValue(value: unknown): string {
 if (value === null || value === undefined || value ==="") return"(empty)";
 if (Array.isArray(value)) {
 if (value.length === 0) return"(none)";
 if (typeof value[0] ==="object" && value[0] !== null) {
 return value
 .map((entry) => {
 const rec = entry as Record<string, unknown>;
 const k = rec.name ?? rec.key ??"";
 const v = rec.value ?? rec.val ??"";
 return k || v ?`${k}: ${v}`: JSON.stringify(entry);
 })
 .join("\n");
 }
 return value.join("\n");
 }
 if (typeof value ==="object") return JSON.stringify(value, null, 2);
 return String(value);
}

function truncate(text: string, max = 220): string {
 return text.length > max ?`${text.slice(0, max)}…`: text;
}

export default function ProductChangeRequestsPage() {
 const [requests, setRequests] = useState<ChangeRequest[]>([]);
 const [loading, setLoading] = useState(true);
 const [statusFilter, setStatusFilter] = useState("PENDING");
 const [busyId, setBusyId] = useState<string | null>(null);
 const [expanded, setExpanded] = useState<Record<string, boolean>>({});

 const load = useCallback(async () => {
 try {
 setLoading(true);
 const data = await apiClient.get<ChangeRequest[]>(
`/admin/product-change-requests?status=${statusFilter}`,
 );
 setRequests(Array.isArray(data) ? data : []);
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to load change requests";
 toast.error(msg);
 setRequests([]);
 } finally {
 setLoading(false);
 }
 }, [statusFilter]);

 useEffect(() => {
 load();
 }, [load]);

 const decide = async (id: string, decision:"approve" |"reject") => {
 setBusyId(id);
 try {
 await apiClient.post(`/admin/product-change-requests/${id}/${decision}`, {});
 toast.success(
 decision ==="approve"
 ?"Approved. The catalog is updated and the change is live."
 :"Rejected. The catalog will keep its current values.",
 );
 setRequests((prev) => prev.filter((r) => r.id !== id));
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :`Failed to ${decision} request`;
 toast.error(msg);
 } finally {
 setBusyId(null);
 }
 };

 const pendingCount = requests.filter((r) => r.status ==="PENDING").length;

 return (
 <div className="max-w-6xl mx-auto space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5">
 <AlertCircle className="w-5 h-5 text-emerald-700" />
 Product Change Requests
 </h1>
 <p className="text-xs text-neutral-500 mt-0.5">
 Catalog edits proposed by sellers who did not create the product. Price and stock
 changes are never gated here — only shared catalog data.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="ex-input rounded-md border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700"
 >
 <option value="PENDING">Pending</option>
 <option value="APPROVED">Approved</option>
 <option value="REJECTED">Rejected</option>
 <option value="WITHDRAWN">Withdrawn</option>
 <option value="ALL">All</option>
 </select>
 <button
 type="button"
 onClick={load}
 disabled={loading}
 className="p-2 rounded-md border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors disabled:opacity-50"
 title="Refresh"
 >
 <RefreshCw className={`w-4 h-4 ${loading ?"animate-spin" :""}`} />
 </button>
 </div>
 </div>

 {/* Summary */}
 {!loading && statusFilter ==="PENDING" && (
 <div className="rounded-md border border-amber-200 bg-amber-50/60 px-5 py-3 text-xs font-semibold text-amber-900">
 {pendingCount === 0
 ?"Nothing waiting on you — every proposed catalog edit has been reviewed."
 :`${pendingCount} catalog edit${pendingCount === 1 ?"" :"s"} waiting for your review.`}
 </div>
 )}

 {/* Content */}
 {loading ? (
 <div className="space-y-4">
 <div className="h-40 bg-white border border-neutral-200 rounded-md animate-pulse" />
 <div className="h-40 bg-white border border-neutral-200 rounded-md animate-pulse" />
 </div>
 ) : requests.length === 0 ? (
 <div className="rounded-md border border-neutral-200 bg-white p-12 text-center space-y-3">
 <div className="w-12 h-12 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
 <CheckCircle2 className="w-6 h-6" />
 </div>
 <h3 className="text-sm font-semibold text-neutral-900">
 {statusFilter ==="PENDING" ?"All caught up" :"No requests found"}
 </h3>
 <p className="text-xs text-neutral-500 max-w-md mx-auto">
 {statusFilter ==="PENDING"
 ?"Sellers can still edit their own price and stock directly. Catalog detail edits will appear here for approval."
 :"No product change requests match this filter."}
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {requests.map((req) => {
 const fieldKeys = Object.keys(req.changes || {});
 const isOpen = !!expanded[req.id];
 return (
 <div
 key={req.id}
 className="rounded-md border border-neutral-200 bg-white p-6 space-y-4"
 >
 {/* Top row */}
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-100 pb-3">
 <div className="space-y-1.5">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-semibold text-neutral-900">
 {req.product_name ||"Unnamed product"}
 </span>
 {req.product_sku && (
 <span className="text-xs font-mono text-neutral-400">
 SKU {req.product_sku}
 </span>
 )}
 <span
 className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
 STATUS_STYLES[req.status] || STATUS_STYLES.PENDING
 }`}
 >
 {req.status}
 </span>
 </div>
 <div className="flex items-center gap-4 text-xs text-neutral-500">
 <span className="inline-flex items-center gap-1">
 <Store className="w-3 h-3" />
 {req.seller_name ||"Marketplace seller"}
 </span>
 <span className="inline-flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {formatDate(req.created_at)}
 </span>
 </div>
 </div>

 <Link
 href={`/products/${req.product_id}`}
 className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:underline shrink-0"
 >
 <Package className="w-3.5 h-3.5" />
 Open product
 <ArrowRight className="w-3 h-3" />
 </Link>
 </div>

 {/* Diff */}
 <div className="space-y-2">
 {fieldKeys.length === 0 ? (
 <p className="text-xs text-neutral-500">
 This proposal no longer differs from the live catalog.
 </p>
 ) : (
 fieldKeys.map((key) => {
 const proposed = (req.changes || {})[key];
 const current = (req.current_values || {})[key];
 return (
 <div
 key={key}
 className="rounded-md border border-neutral-200 overflow-hidden"
 >
 <div className="bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700">
 {FIELD_LABELS[key] || key}
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
 <div className="px-3 py-2">
 <div className="text-xs font-semibold text-neutral-400">
 Current
 </div>
 <pre className="mt-1 text-xs text-neutral-600 whitespace-pre-wrap break-words font-sans">
 {truncate(renderValue(current), isOpen ? 4000 : 220)}
 </pre>
 </div>
 <div className="px-3 py-2 bg-amber-50/40">
 <div className="text-xs font-semibold text-amber-700">
 Proposed
 </div>
 <pre className="mt-1 text-xs text-amber-900 whitespace-pre-wrap break-words font-sans">
 {truncate(renderValue(proposed), isOpen ? 4000 : 220)}
 </pre>
 </div>
 </div>
 </div>
 );
 })
 )}

 {fieldKeys.length > 0 && (
 <button
 type="button"
 onClick={() =>
 setExpanded((prev) => ({ ...prev, [req.id]: !prev[req.id] }))
 }
 className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:underline"
 >
 {isOpen ?"Show less" :"Show full values"}
 </button>
 )}
 </div>

 {/* Review state / actions */}
 {req.status !=="PENDING" ? (
 <div className="rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2 text-xs text-neutral-600">
 Reviewed {formatDate(req.reviewed_at)}
 {req.reviewed_by_email ?`by ${req.reviewed_by_email}`:""}
 {req.review_note ?`— “${req.review_note}”`:""}
 </div>
 ) : (
 <div className="flex items-center justify-end gap-2 pt-1">
 <button
 type="button"
 onClick={() => decide(req.id,"reject")}
 disabled={busyId === req.id}
 className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
 >
 <XCircle className="w-3.5 h-3.5 text-red-500" />
 Reject
 </button>
 <button
 type="button"
 onClick={() => decide(req.id,"approve")}
 disabled={busyId === req.id}
 className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-50"
 >
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
 {busyId === req.id ?"Saving…" :"Approve & publish"}
 </button>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
