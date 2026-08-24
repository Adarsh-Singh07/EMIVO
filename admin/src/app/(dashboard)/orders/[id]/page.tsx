"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Package,
  Truck,
  Home,
  XCircle,
  RotateCcw,
  Ticket,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "@/components/admin/status-badges";
import { Modal } from "@/components/admin/Modal";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ShippingAddress {
  full_name?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  currency: string;
  payment_method: string | null;
  payment_status: string | null;
  coupon_code: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  shipping_address: ShippingAddress | null;
  items: OrderItem[];
  created_at: string;
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

/** Backend state machine: PENDING→CONFIRMED→PROCESSING→SHIPPED→DELIVERED; CANCELLED; DELIVERED→REFUNDED. */
const NEXT_ACTIONS: Record<string, Array<{ label: string; target: string; style: "primary" | "danger" | "neutral"; tracking?: boolean; reason?: boolean }>> = {
  PENDING: [
    { label: "Confirm", target: "CONFIRMED", style: "primary" },
    { label: "Cancel", target: "CANCELLED", style: "danger", reason: true },
  ],
  CONFIRMED: [
    { label: "Start Processing", target: "PROCESSING", style: "primary" },
    { label: "Cancel", target: "CANCELLED", style: "danger", reason: true },
  ],
  PROCESSING: [
    { label: "Mark Shipped", target: "SHIPPED", style: "primary", tracking: true },
    { label: "Cancel", target: "CANCELLED", style: "danger", reason: true },
  ],
  SHIPPED: [
    { label: "Mark Delivered", target: "DELIVERED", style: "primary" },
    { label: "Cancel", target: "CANCELLED", style: "danger", reason: true },
  ],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Ship modal
  const [shipOpen, setShipOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  // Cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Refund modal
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState(""); // rupees, empty = full
  const [refundReason, setRefundReason] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [o, p] = await Promise.all([
        apiClient.get<Order>(`/orders/${id}`),
        apiClient.get<{ items: Payment[] }>(`/payments?order_id=${id}`).catch(() => ({ items: [] as Payment[] })),
      ]);
      setOrder(o);
      setPayments(p?.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const applyTransition = async (
    target: string,
    extra?: { reason?: string; tracking_number?: string; tracking_url?: string }
  ) => {
    setTransitioning(true);
    try {
      const payload: Record<string, unknown> = { status: target };
      if (extra?.reason) payload.reason = extra.reason;
      if (extra?.tracking_number) payload.tracking_number = extra.tracking_number;
      if (extra?.tracking_url) payload.tracking_url = extra.tracking_url;
      const updated = await apiClient.patch<Order>(`/orders/${id}/status`, payload);
      setOrder(updated);
      toast.success(`Order moved to ${target}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Transition failed");
    } finally {
      setTransitioning(false);
    }
  };

  const submitRefund = async () => {
    if (!refundPayment) return;
    setTransitioning(true);
    try {
      const payload: Record<string, unknown> = {};
      if (refundAmount.trim() !== "") {
        const paise = Math.round(parseFloat(refundAmount.replace(/[₹,\s]/g, "")) * 100);
        if (!Number.isFinite(paise) || paise <= 0) {
          toast.error("Refund amount must be a positive ₹ value");
          setTransitioning(false);
          return;
        }
        payload.amount = paise;
      }
      if (refundReason.trim()) payload.reason = refundReason.trim();
      await apiClient.post(`/payments/${refundPayment.id}/refund`, payload);
      toast.success("Refund issued");
      setRefundPayment(null);
      setRefundAmount("");
      setRefundReason("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Refund failed");
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-semibold text-red-700">{error || "Order not found"}</p>
        <button onClick={() => router.push("/orders")} className="text-sm font-semibold text-red-700 underline">
          Back to orders
        </button>
      </div>
    );
  }

  const actions = NEXT_ACTIONS[order.status?.toUpperCase()] || [];
  const capturedPayments = payments.filter((p) => p.status?.toUpperCase() === "CAPTURED");
  const addr = order.shipping_address;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/orders"
            className="rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-neutral-900">{order.order_number || order.id.slice(0, 8)}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-0.5 text-sm text-neutral-500">
              Placed {new Date(order.created_at).toLocaleString("en-IN")} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Timeline / tracking */}
      {(order.tracking_number || order.tracking_url || order.shipped_at || order.delivered_at) && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm">
          {order.shipped_at && (
            <span className="inline-flex items-center gap-2 text-neutral-600">
              <Truck className="h-4 w-4 text-purple-500" />
              Shipped {new Date(order.shipped_at).toLocaleString("en-IN")}
            </span>
          )}
          {order.delivered_at && (
            <span className="inline-flex items-center gap-2 text-neutral-600">
              <Home className="h-4 w-4 text-emerald-500" />
              Delivered {new Date(order.delivered_at).toLocaleString("en-IN")}
            </span>
          )}
          {order.tracking_number && (
            <span className="inline-flex items-center gap-2 text-neutral-600">
              <Package className="h-4 w-4 text-neutral-400" />
              Tracking: <span className="font-mono">{order.tracking_number}</span>
            </span>
          )}
          {order.tracking_url && (
            <a
              href={order.tracking_url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-amber-600 underline underline-offset-2"
            >
              Open tracking link
            </a>
          )}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <h2 className="border-b border-neutral-200 px-5 py-4 text-base font-bold text-neutral-900">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3 text-right">Unit Price</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3.5">
                        <Link href={`/products/${item.product_id}`} className="font-semibold text-neutral-900 hover:text-amber-600">
                          {item.product_name}
                        </Link>
                        {item.variant_name && <p className="text-xs text-neutral-400">{item.variant_name}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-600">{formatINR(item.unit_price)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-neutral-700">{item.quantity}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-neutral-900">{formatINR(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Payments */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <h2 className="border-b border-neutral-200 px-5 py-4 text-base font-bold text-neutral-900">Payments</h2>
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-neutral-400">
                No payment records{order.payment_method === "COD" ? " (collect on delivery)" : ""}.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-neutral-900">{formatINR(p.amount)}</span>
                      <PaymentStatusBadge status={p.status} />
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                        {p.provider}
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400">{p.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-neutral-400">
                        {new Date(p.created_at).toLocaleString("en-IN")}
                      </span>
                      {p.status?.toUpperCase() === "CAPTURED" && (
                        <button
                          onClick={() => {
                            setRefundPayment(p);
                            setRefundAmount("");
                            setRefundReason("");
                          }}
                          disabled={transitioning}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Refund
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Status actions */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-neutral-900">Actions</h2>
            <div className="flex flex-col gap-2">
              {actions.map((action) => (
                <button
                  key={action.target}
                  onClick={() => {
                    if (action.tracking) {
                      setTrackingNumber("");
                      setTrackingUrl("");
                      setShipOpen(true);
                    } else if (action.reason) {
                      setCancelReason("");
                      setCancelOpen(true);
                    } else {
                      applyTransition(action.target);
                    }
                  }}
                  disabled={transitioning}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                    action.style === "primary"
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700"
                      : action.style === "danger"
                        ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {action.style === "danger" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {action.label}
                </button>
              ))}
              {actions.length === 0 && (
                <p className="rounded-xl border border-dashed border-neutral-200 p-3 text-center text-xs text-neutral-400">
                  {order.status === "REFUNDED" || order.status === "CANCELLED" ? "This order is in a terminal state." : "No further actions."}
                </p>
              )}
              {order.status === "DELIVERED" && capturedPayments.length > 0 && (
                <p className="text-center text-xs text-neutral-400">Use “Refund” on a captured payment below to refund this order.</p>
              )}
            </div>
          </section>

          {/* Totals */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-neutral-900">Totals</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd className="font-mono text-neutral-800">{formatINR(order.subtotal)}</dd>
              </div>
              {order.discount_total > 0 && (
                <div className="flex justify-between">
                  <dt className="inline-flex items-center gap-1 text-neutral-500">
                    Discount
                    {order.coupon_code && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Ticket className="h-2.5 w-2.5" />
                        {order.coupon_code}
                      </span>
                    )}
                  </dt>
                  <dd className="font-mono text-emerald-600">-{formatINR(order.discount_total)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500">Shipping</dt>
                <dd className="font-mono text-neutral-800">{order.shipping_total > 0 ? formatINR(order.shipping_total) : "Free"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Tax</dt>
                <dd className="font-mono text-neutral-800">{formatINR(order.tax_total)}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2.5">
                <dt className="font-bold text-neutral-900">Total</dt>
                <dd className="font-mono text-base font-bold text-neutral-900">{formatINR(order.total)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-2">
              <PaymentMethodBadge method={order.payment_method} />
              {order.payment_status && <PaymentStatusBadge status={order.payment_status} />}
            </div>
          </section>

          {/* Customer + address */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-neutral-900">
              <MapPin className="h-4 w-4 text-amber-500" />
              Customer &amp; Address
            </h2>
            {addr ? (
              <div className="space-y-1 text-sm text-neutral-600">
                <p className="font-semibold text-neutral-900">{addr.full_name || "—"}</p>
                {addr.phone && <p className="font-mono text-xs">{addr.phone}</p>}
                <p>
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}
                </p>
                <p>
                  {addr.city}
                  {addr.state ? `, ${addr.state}` : ""} {addr.pincode}
                </p>
                <p className="text-xs text-neutral-400">{addr.country || "IN"}</p>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No address snapshot on this order.</p>
            )}

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-neutral-900">Notes & Complaints</h3>
              </div>
              <textarea
                className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
                placeholder="Log internal notes, customer complaints, or special instructions here..."
                defaultValue={order.notes || ""}
                onBlur={async (e) => {
                  if (e.target.value === (order.notes || "")) return;
                  try {
                    await apiClient.patch(`/orders/${order.id}/notes`, { notes: e.target.value });
                    toast.success("Notes updated");
                  } catch (err) {
                    toast.error("Failed to update notes");
                  }
                }}
              />
              <p className="text-xs text-neutral-500 mt-1">Changes are saved automatically when you click outside.</p>
            </div>
          </section>
        </div>
      </div>

      {/* Ship modal */}
      <Modal
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        title="Mark order as shipped"
        footer={
          <>
            <button
              onClick={() => setShipOpen(false)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShipOpen(false);
                applyTransition("SHIPPED", {
                  tracking_number: trackingNumber.trim() || undefined,
                  tracking_url: trackingUrl.trim() || undefined,
                });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700"
            >
              <Truck className="h-4 w-4" /> Ship Order
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">Tracking details are optional but recommended — they are emailed to the customer.</p>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Tracking number</label>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1234567890"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Tracking URL</label>
            <input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://courier.example/track/..."
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel order"
        footer={
          <>
            <button
              onClick={() => setCancelOpen(false)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Keep Order
            </button>
            <button
              onClick={() => {
                setCancelOpen(false);
                applyTransition("CANCELLED", { reason: cancelReason.trim() || "Cancelled by store" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <XCircle className="h-4 w-4" /> Cancel Order
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Cancelling releases reserved stock (and restocks confirmed COD orders). This cannot be undone.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Reason</label>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. customer request, out of stock"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </Modal>

      {/* Refund modal */}
      <Modal
        open={!!refundPayment}
        onClose={() => setRefundPayment(null)}
        title="Refund payment"
        footer={
          <>
            <button
              onClick={() => setRefundPayment(null)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitRefund}
              disabled={transitioning}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Confirm Refund
            </button>
          </>
        }
      >
        {refundPayment && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">
              Refund payment <span className="font-mono text-xs">{refundPayment.id.slice(0, 8)}</span> of{" "}
              <span className="font-bold">{formatINR(refundPayment.amount)}</span>. Leave the amount empty for a full refund.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Amount (₹, optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`full refund (${formatINR(refundPayment.amount)})`}
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Reason (optional)</label>
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. damaged item"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
