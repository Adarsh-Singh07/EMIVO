"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  ChevronRight,
  LogIn,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  MapPin,
  Truck,
  X,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  PhoneCall,
  Loader2,
  ExternalLink,
  Ban,
  Tag,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type OrderV2 } from "@/lib/store-api";
import { inr, formatDate } from "@/lib/format";
import { toast } from "sonner";

/* ── Status presentation ─────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  PENDING:           { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   label: "Order Placed" },
  PAYMENT_PENDING:   { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200",  label: "Payment Pending" },
  CONFIRMED:         { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    label: "Confirmed" },
  PROCESSING:        { bg: "bg-indigo-50",   text: "text-indigo-700",  border: "border-indigo-200",  label: "Processing" },
  PACKED:            { bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-200",  label: "Packed" },
  SHIPPED:           { bg: "bg-purple-50",   text: "text-purple-700",  border: "border-purple-200",  label: "Shipped" },
  OUT_FOR_DELIVERY:  { bg: "bg-sky-50",      text: "text-sky-700",     border: "border-sky-200",     label: "Out for Delivery" },
  DELIVERED:         { bg: "bg-green-50",    text: "text-green-700",   border: "border-green-200",   label: "Delivered" },
  CANCELLED:         { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     label: "Cancelled" },
  REFUNDED:          { bg: "bg-neutral-50",  text: "text-neutral-600", border: "border-neutral-200", label: "Refunded" },
  PAYMENT_FAILED:    { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     label: "Payment Failed" },
};

const TIMELINE_STEPS = [
  { key: "PENDING",          icon: Package,      label: "Order Placed" },
  { key: "CONFIRMED",        icon: CheckCircle2, label: "Confirmed" },
  { key: "PROCESSING",       icon: RotateCcw,    label: "Processing" },
  { key: "PACKED",           icon: Package,      label: "Packed" },
  { key: "SHIPPED",          icon: Truck,        label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", icon: Truck,        label: "Out for Delivery" },
  { key: "DELIVERED",        icon: CheckCircle2, label: "Delivered" },
];

const CANCEL_REASONS = [
  "Changed my mind",
  "Found a better price elsewhere",
  "Ordered by mistake",
  "Shipping time too long",
  "Product no longer needed",
  "Other",
];

const CAN_CANCEL = new Set(["PENDING", "CONFIRMED", "PROCESSING"]);

function statusStyle(status: string) {
  return (
    STATUS_STYLES[status?.toUpperCase()] ?? {
      bg: "bg-neutral-50",
      text: "text-neutral-600",
      border: "border-neutral-200",
      label: status,
    }
  );
}

/* ── Cancel Modal ──────────────────────────────────────────────────── */
function CancelModal({
  order,
  onClose,
  onConfirm,
}: {
  order: OrderV2;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const finalReason = reason === "Other" ? custom.trim() || "Other" : reason;
    await onConfirm(finalReason);
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-red-100 grid place-items-center">
                <Ban className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold">Cancel Order</h2>
            </div>
            <p className="text-sm text-neutral-500">
              Order {order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-neutral-700 mb-3">
            Why are you cancelling?
          </p>
          <div className="space-y-2">
            {CANCEL_REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-neutral-950 w-4 h-4"
                />
                <span className="text-sm text-neutral-700">{r}</span>
              </label>
            ))}
          </div>
          {reason === "Other" && (
            <textarea
              className="mt-3 w-full border border-neutral-300 rounded-xl p-3 text-sm outline-none focus:border-neutral-950 resize-none"
              placeholder="Tell us more (optional)"
              rows={3}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Cancellation is permanent. If you paid online, refunds are processed within 5–7 business days.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            Keep Order
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Cancelling…" : "Confirm Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Order Timeline ────────────────────────────────────────────────── */
function OrderTimeline({ status }: { status: string }) {
  const upper = status?.toUpperCase();
  if (
    ["CANCELLED", "PAYMENT_FAILED", "PAYMENT_PENDING", "REFUNDED"].includes(upper)
  ) {
    return null;
  }
  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === upper);

  return (
    <div className="relative">
      <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-neutral-100" />
      <div className="space-y-4">
        {TIMELINE_STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="relative flex items-start gap-4">
              <div
                className={`relative z-10 w-8 h-8 rounded-full grid place-items-center shrink-0 transition-colors ${
                  done
                    ? "bg-green-600 text-white"
                    : active
                    ? "bg-neutral-950 text-white ring-4 ring-neutral-950/10"
                    : "bg-white border-2 border-neutral-200 text-neutral-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="pt-1">
                <p
                  className={`text-sm font-medium ${
                    done || active ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {step.label}
                </p>
                {active && (
                  <p className="text-xs text-neutral-500 mt-0.5">Current status</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Order Detail Panel ────────────────────────────────────────────── */
function OrderDetail({
  order,
  onBack,
  onCancelled,
}: {
  order: OrderV2;
  onBack: () => void;
  onCancelled: (id: string, updated: OrderV2) => void;
}) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const st = statusStyle(order.status);
  const canCancel = CAN_CANCEL.has(order.status?.toUpperCase());

  const handleCancel = async (_reason: string) => {
    try {
      const updated = await storeApi.cancelOrder(order.id);
      toast.success("Order cancelled successfully");
      onCancelled(order.id, updated);
      setShowCancelModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel. Please contact support.");
      setShowCancelModal(false);
    }
  };

  const addr = order.shipping_address as any;

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      {/* Header */}
      <div className="border border-neutral-200 rounded-3xl overflow-hidden bg-white mb-4">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-neutral-50 to-white border-b border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                Order Details
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                {order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(order.created_at)}
                </span>
                {order.payment_method && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    {order.payment_method === "COD"
                      ? "Cash on Delivery"
                      : "Online Payment"}
                  </span>
                )}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full border font-semibold ${st.bg} ${st.text} ${st.border}`}
            >
              {st.label}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="divide-y divide-neutral-100">
          {(order.items || []).map((item: any) => (
            <div
              key={item.id || item.product_id}
              className="p-5 sm:p-6 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug line-clamp-2">
                  {item.product_name || "Product"}
                </p>
                {item.variant_name && (
                  <p className="text-xs text-neutral-500 mt-0.5">{item.variant_name}</p>
                )}
                <p className="text-xs text-neutral-500 mt-1">Qty: {item.quantity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">
                  {inr(item.subtotal ?? item.unit_price * item.quantity)}
                </p>
                <p className="text-xs text-neutral-400">{inr(item.unit_price)} each</p>
              </div>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div className="p-5 sm:p-6 bg-neutral-50 border-t border-neutral-100">
          <div className="space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>{inr(order.subtotal)}</span>
            </div>
            {(order.discount_total ?? 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Discount
                </span>
                <span>−{inr(order.discount_total)}</span>
              </div>
            )}
            {(order.shipping_total ?? 0) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> Shipping & COD fee
                </span>
                <span>{inr(order.shipping_total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-neutral-200">
              <span>Total</span>
              <span>{inr(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {addr && (
        <div className="border border-neutral-200 rounded-2xl p-5 bg-white mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-500" /> Delivery Address
          </h3>
          <p className="text-sm text-neutral-700 leading-relaxed">
            {addr.full_name || addr.name}
            {addr.phone && (
              <span className="block text-neutral-500 text-xs mt-0.5">{addr.phone}</span>
            )}
            <span className="block mt-0.5">
              {addr.line1 || addr.street}
              {addr.line2 ? `, ${addr.line2}` : ""}
            </span>
            <span className="block text-neutral-500 text-xs">
              {addr.city}, {addr.state} –{" "}
              {addr.pincode || addr.postal_code}
            </span>
          </p>
        </div>
      )}

      {/* Tracking */}
      {order.tracking_number && (
        <div className="border border-neutral-200 rounded-2xl p-5 bg-white mb-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-neutral-500" /> Tracking
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">Tracking Number</p>
              <p className="font-mono font-semibold mt-0.5">{order.tracking_number}</p>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800"
              >
                Track <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="border border-neutral-200 rounded-2xl p-5 bg-white mb-4">
        <h3 className="text-sm font-semibold mb-4">Order Progress</h3>
        <OrderTimeline status={order.status} />
        {["CANCELLED", "REFUNDED"].includes(order.status?.toUpperCase()) && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
            <Ban className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">
                {order.status === "CANCELLED"
                  ? "Order cancelled"
                  : "Refund initiated"}
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {order.status === "REFUNDED"
                  ? "Refund will reach your original payment method within 5–7 business days."
                  : "No charges apply for COD orders."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Ban className="w-4 h-4" /> Cancel Order
          </button>
        )}
        <Link
          href={`/order-tracking?order=${order.order_number || order.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
        >
          <Truck className="w-4 h-4" /> Track Order
        </Link>
        <a
          href="mailto:support@elektrix.in"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
        >
          <PhoneCall className="w-4 h-4" /> Get Help
        </a>
      </div>

      {showCancelModal && (
        <CancelModal
          order={order}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}

/* ── Order Card ──────────────────────────────────────────────────────*/
function OrderCard({ order, onClick }: { order: OrderV2; onClick: () => void }) {
  const st = statusStyle(order.status);
  const firstItem = order.items?.[0];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-neutral-300 transition-all group"
    >
      <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate">
            {order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}
          </span>
          <span className="text-neutral-300 hidden sm:block">|</span>
          <span className="text-xs text-neutral-500 hidden sm:flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" />
            {formatDate(order.created_at)}
          </span>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border font-semibold shrink-0 ${st.bg} ${st.text} ${st.border}`}
        >
          {st.label}
        </span>
      </div>

      <div className="p-5 flex items-start gap-4">

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug line-clamp-2">
            {firstItem?.product_name || "Order"}
            {(order.items?.length ?? 0) > 1 && (
              <span className="text-neutral-500">
                {" "}+{(order.items?.length ?? 1) - 1} more
              </span>
            )}
          </p>
          {(firstItem as any)?.variant_name && (
            <p className="text-xs text-neutral-500 mt-0.5">
              {(firstItem as any).variant_name}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-base font-bold">{inr(order.total)}</span>
            {order.payment_method && (
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {order.payment_method === "COD" ? "Cash on Delivery" : "Online"}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center text-neutral-400 group-hover:text-neutral-700 transition-colors mt-4">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>

      {order.tracking_number && (
        <div className="px-5 pb-3">
          <p className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Tracking:{" "}
            <span className="font-mono font-medium text-neutral-700">
              {order.tracking_number}
            </span>
          </p>
        </div>
      )}
    </button>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────*/
export default function CustomerOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderV2[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderV2 | null>(null);

  const loadOrders = useCallback(() => {
    if (!user) return;
    setFetching(true);
    storeApi
      .listOrders({ page: 1, page_size: 50 })
      .then((data) => setOrders(data.items || []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load orders")
      )
      .finally(() => setFetching(false));
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCancelled = (id: string, updated: OrderV2) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    if (selectedOrder?.id === id) setSelectedOrder(updated);
  };

  if (loading || (fetching && orders.length === 0)) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
        <div className="h-7 bg-neutral-100 rounded w-32 mb-8 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-16 h-16 text-neutral-400 mx-auto mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Sign in to view orders
        </h1>
        <p className="text-neutral-500 mb-6">
          Your order history will appear here after you log in.
        </p>
        <Link
          href="/login?next=/account/orders"
          className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
        >
          <LogIn className="w-4 h-4" /> Log In
        </Link>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onCancelled={handleCancelled}
      />
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          {orders.length > 0 && (
            <p className="text-neutral-500 text-sm mt-1">
              {orders.length} order{orders.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>
        <Link
          href="/shop"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-950 transition-colors"
        >
          Continue Shopping →
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-700 flex-1">{error}</p>
          <button
            onClick={loadOrders}
            className="text-xs font-semibold text-red-600 hover:text-red-800 underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {!error && orders.length === 0 && (
        <div className="text-center py-24">
          <Package className="w-20 h-20 text-neutral-200 mx-auto mb-6" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-neutral-500 mb-8">
            You haven&apos;t placed any orders yet. Start shopping!
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800"
          >
            Shop Now
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={() => setSelectedOrder(order)}
          />
        ))}
      </div>
    </div>
  );
}
