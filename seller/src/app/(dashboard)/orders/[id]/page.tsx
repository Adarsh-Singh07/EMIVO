"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Box,
  FileText,
  Barcode,
  KeyRound,
  Store,
  ExternalLink,
  Phone,
  User as UserIcon,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { apiClient, ApiError, authStorage } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

interface OrderLine {
  item_id: string;
  product_id: string;
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  seller_name?: string | null;
  serial_numbers?: string[] | null;
  imei_numbers?: string[] | null;
}

interface ShippingAddress {
  full_name?: string;
  name?: string;
  phone?: string;
  line1?: string;
  street?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface OrderDetail {
  order_id: string;
  order_number?: string | null;
  status: string;
  payment_method?: string | null;
  payment_status?: string | null;
  fulfillment_type?: string | null;
  is_open_box: boolean;
  delivery_verified_at?: string | null;
  invoice_number?: string | null;
  manual_invoice_url?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
  currency: string;
  order_subtotal: number;
  order_tax_total: number;
  order_shipping_total: number;
  order_discount_total: number;
  order_total: number;
  items_subtotal: number;
  shipping_address?: ShippingAddress | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: OrderLine[];
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-blue-50 text-blue-800 border-blue-200",
  PROCESSING: "bg-blue-50 text-blue-800 border-blue-200",
  PACKED: "bg-indigo-50 text-indigo-800 border-indigo-200",
  SHIPPED: "bg-purple-50 text-purple-800 border-purple-200",
  OUT_FOR_DELIVERY: "bg-purple-50 text-purple-800 border-purple-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
};

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SellerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<OrderDetail>(`/seller/orders/${orderId}`);
      // Older API builds omitted `items` on an order with no seller lines; a
      // missing array would crash every `.length` / `.map` below.
      setOrder({
        ...data,
        items: Array.isArray(data?.items) ? data.items : [],
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load order";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const openInvoice = async () => {
    if (!order) return;
    const token = authStorage.getToken() || "";
    const base = process.env.NEXT_PUBLIC_API_URL || "https://api.elektrix.in/api/v1";
    try {
      setBusy("invoice");
      const res = await fetch(`${base}/seller/orders/${order.order_id}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        throw new Error(
          (typeof data.error === "string" && data.error) ||
            (typeof data.detail === "string" && data.detail) ||
            `Invoice unavailable (${res.status})`
        );
      }
      const html = await res.text();
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open invoice");
    } finally {
      setBusy(null);
    }
  };

  const markPacked = async () => {
    if (!order || !order.items.length) return;
    const first = order.items[0];
    try {
      setBusy("pack");
      await apiClient.post(`/seller/orders/${order.order_id}/items/${first.item_id}/pack`);
      toast.success("Order marked as packed.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to mark as packed");
    } finally {
      setBusy(null);
    }
  };

  const startPickup = async () => {
    if (!order) return;
    try {
      setBusy("pickup");
      await apiClient.post(`/seller/orders/${order.order_id}/direct-delivery`);
      toast.success("Store pickup started. Customer has been sent the delivery OTP.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start store pickup");
    } finally {
      setBusy(null);
    }
  };

  const verifyOtp = async () => {
    if (!order) return;
    if (!otp.trim()) {
      toast.error("Enter the customer's 6-digit OTP");
      return;
    }
    try {
      setBusy("otp");
      await apiClient.post(`/seller/orders/${order.order_id}/verify-delivery-otp`, {
        otp: otp.trim(),
      });
      toast.success("Delivery confirmed. Tax invoice generated.");
      setOtp("");
      setShowOtp(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid OTP");
    } finally {
      setBusy(null);
    }
  };

  if (loading && !order) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-40 animate-pulse rounded-xl border border-neutral-200 bg-white" />
        <div className="h-56 animate-pulse rounded-xl border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ChevronLeft className="w-4 h-4" /> Back to orders
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Could not open this order</p>
            <p className="mt-1">{error || "Order not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const status = (order.status || "").toUpperCase();
  const statusStyle = STATUS_STYLES[status] || "bg-neutral-100 text-neutral-800 border-neutral-200";
  const canPack = ["CONFIRMED", "PROCESSING", "PENDING"].includes(status);
  const canPickup = canPack || status === "PACKED";
  const awaitingOtp = status === "OUT_FOR_DELIVERY";
  const addr = order.shipping_address || {};
  const line1 = addr.line1 || addr.street || "";
  const isCod = (order.payment_method || "").toUpperCase() === "COD";
  const paid = (order.payment_status || "").toUpperCase() === "SUCCESS" ||
    (order.payment_status || "").toUpperCase() === "CAPTURED";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to orders
          </button>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-neutral-800" />
            #{order.order_number || order.order_id.slice(0, 8)}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Placed {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusStyle}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {statusLabel(status)}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canPack && (
          <button
            onClick={markPacked}
            disabled={busy === "pack"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Box className="w-3.5 h-3.5 text-amber-400" />
            {busy === "pack" ? "Packing..." : "Mark as Packed"}
          </button>
        )}
        {canPickup && (
          <button
            onClick={startPickup}
            disabled={busy === "pickup"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            <Store className="w-3.5 h-3.5 text-amber-600" />
            {busy === "pickup" ? "Starting..." : "Store Pickup / Handover"}
          </button>
        )}
        {awaitingOtp && (
          <button
            onClick={() => setShowOtp((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Verify Delivery OTP
          </button>
        )}
        <button
          onClick={openInvoice}
          disabled={busy === "invoice"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5" />
          {busy === "invoice" ? "Opening..." : "Print / Download Invoice"}
        </button>
        {order.manual_invoice_url && (
          <a
            href={order.manual_invoice_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Store Bill
          </a>
        )}
      </div>

      {showOtp && awaitingOtp && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs text-emerald-900 mb-2">
            Ask the customer for the 6-digit delivery OTP sent to their phone to confirm handover.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              className="w-40 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-mono tracking-widest text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={verifyOtp}
              disabled={busy === "otp"}
              className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === "otp" ? "Verifying..." : "Confirm Delivery"}
            </button>
            <button
              onClick={() => {
                setShowOtp(false);
                setOtp("");
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Customer & delivery */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <MapPin className="w-4 h-4 text-neutral-500" />
              Delivery Address
            </h2>
            <div className="mt-3 space-y-1 text-sm text-neutral-700">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                {addr.full_name || addr.name || order.customer_name || "Customer"}
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <a href={`tel:${order.customer_phone}`} className="hover:underline">
                    {order.customer_phone}
                  </a>
                </div>
              )}
              <div className="pt-1 text-xs leading-relaxed text-neutral-700">
                {line1}
                {addr.line2 ? <>, {addr.line2}</> : null}
                <br />
                {[addr.city, addr.state].filter(Boolean).join(", ")}
                {addr.pincode ? <> - {addr.pincode}</> : null}
                <br />
                {addr.country || "India"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-neutral-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <Box className="w-4 h-4 text-neutral-500" />
                Your Items ({order.items.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50/80 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-5 py-2.5">Product</th>
                    <th className="px-5 py-2.5 text-center">Qty</th>
                    <th className="px-5 py-2.5 text-right">Unit</th>
                    <th className="px-5 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {order.items.map((item) => (
                    <tr key={item.item_id}>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-neutral-900">{item.product_name}</span>
                        {item.variant_name && (
                          <span className="block text-xs text-neutral-500">{item.variant_name}</span>
                        )}
                        {item.serial_numbers && item.serial_numbers.length > 0 && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-neutral-500">
                            <Barcode className="w-3 h-3" /> {item.serial_numbers.join(", ")}
                          </span>
                        )}
                        {item.imei_numbers && item.imei_numbers.length > 0 && (
                          <span className="mt-0.5 block text-[10px] font-mono text-neutral-500">
                            IMEI: {item.imei_numbers.join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center font-semibold">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-neutral-600">
                        {formatINR(item.unit_price)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-neutral-900">
                        {formatINR(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50/60 text-xs">
                  <tr>
                    <td colSpan={3} className="px-5 py-2 text-right text-neutral-500">
                      Your items subtotal
                    </td>
                    <td className="px-5 py-2 text-right font-bold text-neutral-900">
                      {formatINR(order.items_subtotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Payment, status & invoice */}
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <ShieldCheck className="w-4 h-4 text-neutral-500" />
              Payment
            </h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-500">Method</dt>
                <dd className="font-semibold text-neutral-900">
                  {isCod ? "Cash on Delivery" : "Online"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-500">Payment status</dt>
                <dd>
                  {paid ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  ) : isCod ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      <Clock className="w-3 h-3" /> Collect on delivery
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                      {order.payment_status ? statusLabel(order.payment_status) : "Pending"}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                <dt className="text-neutral-500">Order total</dt>
                <dd className="text-sm font-bold text-neutral-900">
                  {formatINR(order.order_total)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Truck className="w-4 h-4 text-neutral-500" />
              Fulfillment
            </h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-500">Type</dt>
                <dd className="font-semibold text-neutral-900">
                  {order.fulfillment_type === "STORE_PICKUP" ? "Store Pickup" : "Standard Courier"}
                </dd>
              </div>
              {order.invoice_number && (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Invoice no.</dt>
                  <dd className="font-mono text-[11px] font-semibold text-neutral-900">
                    {order.invoice_number}
                  </dd>
                </div>
              )}
              {order.tracking_number && (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">AWB</dt>
                  <dd className="font-mono text-[11px] font-semibold text-neutral-900">
                    {order.tracking_number}
                  </dd>
                </div>
              )}
              {order.shipped_at && (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Shipped</dt>
                  <dd className="text-neutral-800">{formatDate(order.shipped_at)}</dd>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Delivered</dt>
                  <dd className="text-neutral-800">{formatDate(order.delivered_at)}</dd>
                </div>
              )}
              {order.is_open_box && (
                <p className="border-t border-neutral-100 pt-2 text-[11px] leading-relaxed text-neutral-500">
                  Open-box delivery: the customer verifies the product before signing.
                </p>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
