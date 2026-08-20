"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  ChevronRight,
  LogIn,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Tag,
  Truck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type OrderV2 } from "@/lib/store-api";
import { inr, formatDate } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

export default function CustomerOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderV2[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderV2 | null>(null);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    storeApi
      .listOrders({ page: 1, page_size: 50 })
      .then((data) => setOrders(data.items || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-6 bg-neutral-100 rounded w-1/4 mx-auto mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-16 h-16 text-neutral-400 mx-auto mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Authentication Required</h1>
        <p className="text-neutral-500 mb-6">Please log in to view your orders.</p>
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
    const o = selectedOrder;
    return (
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <button
          onClick={() => setSelectedOrder(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </button>

        <div className="border border-neutral-200 rounded-3xl overflow-hidden bg-white">
          <div className="p-6 sm:p-8 bg-neutral-50 border-b border-neutral-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Order Details</p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {o.order_number || `#${o.id.slice(0, 8).toUpperCase()}`}
                </h1>
              </div>
              <div>
                <span
                  className={`inline-block text-sm px-3 py-1 rounded-full border font-medium capitalize ${
                    STATUS_STYLES[o.status?.toLowerCase()] ||
                    "bg-neutral-100 text-neutral-700 border-neutral-200"
                  }`}
                >
                  {o.status?.toLowerCase()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
              <div>
                <span className="text-neutral-400 block">Date Placed</span>
                <span className="font-semibold text-neutral-800">
                  {o.created_at ? formatDate(o.created_at) : "—"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Payment Method</span>
                <span className="font-semibold text-neutral-800">
                  {o.payment_method === "COD" ? "Cash on Delivery" : "Online (Cashfree)"}
                </span>
              </div>
              {o.coupon_code ? (
                <div>
                  <span className="text-neutral-400 block">Coupon</span>
                  <span className="font-semibold text-neutral-800 inline-flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {o.coupon_code}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-neutral-400 block">Items</span>
                  <span className="font-semibold text-neutral-800">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                </div>
              )}
            </div>

            {(o.tracking_number || o.tracking_url) && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white border border-neutral-200 p-4">
                <span className="text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-neutral-400" />
                  Tracking: <span className="font-semibold">{o.tracking_number}</span>
                </span>
                {o.tracking_url && (
                  <a
                    href={o.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800"
                  >
                    Track shipment <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Items */}
            <div>
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-neutral-400" /> Items
              </h3>
              <div className="divide-y divide-neutral-100 border-y border-neutral-100">
                {o.items.map((item, idx) => (
                  <div key={`${item.product_id}-${idx}`} className="py-4 flex justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-neutral-900">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-neutral-500 mt-0.5">Variant: {item.variant_name}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-1">
                        Qty {item.quantity} × {inr(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-semibold text-neutral-800 shrink-0">{inr(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & totals */}
            <div className="grid sm:grid-cols-2 gap-8 pt-4">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-neutral-400" /> Shipping Address
                </h3>
                {o.shipping_address ? (
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    <span className="font-semibold text-neutral-900 block mb-1">
                      {o.shipping_address.name || o.shipping_address.full_name}
                    </span>
                    {o.shipping_address.line1 || o.shipping_address.street}
                    {o.shipping_address.line2 ? `, ${o.shipping_address.line2}` : ""}
                    <br />
                    {o.shipping_address.city}, {o.shipping_address.state} —{" "}
                    {o.shipping_address.pincode}
                    {o.shipping_address.phone ? (
                      <>
                        <br />
                        Phone: {o.shipping_address.phone}
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-400">Address unavailable</p>
                )}
              </div>
              <div className="bg-neutral-50 rounded-2xl p-5 text-sm space-y-3">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-neutral-800">{inr(o.subtotal)}</span>
                </div>
                {o.discount_total > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}</span>
                    <span className="font-medium">−{inr(o.discount_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-500">
                  <span>Shipping</span>
                  <span className="font-medium text-neutral-800">
                    {o.shipping_total === 0 ? "FREE" : inr(o.shipping_total)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold text-base text-neutral-900">
                  <span>Total</span>
                  <span>{inr(o.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          {o.order_number && (
            <Link
              href={`/order-tracking?orderId=${encodeURIComponent(o.order_number)}`}
              className="h-12 inline-flex items-center justify-center px-8 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors"
            >
              Track Order Status
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
        <Link href="/account" className="hover:text-neutral-900">
          My Account
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>Orders</span>
      </div>

      <h1 className="text-4xl font-semibold tracking-tight mb-8">My Orders</h1>

      {error && (
        <div className="rounded-3xl border border-neutral-100 p-6 text-sm text-neutral-500 bg-red-50/20">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="border border-dashed border-neutral-200 rounded-3xl p-16 text-center text-neutral-400">
          <Package className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <p className="text-sm">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 h-10 px-6 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Explore Store
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelectedOrder(o)}
              className="border border-neutral-200 rounded-3xl p-5 sm:p-6 bg-white hover:border-neutral-950 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold text-base sm:text-lg">
                    {o.order_number || `#${o.id.slice(0, 8).toUpperCase()}`}
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      STATUS_STYLES[o.status?.toLowerCase()] ||
                      "bg-neutral-50 text-neutral-600 border-neutral-200"
                    }`}
                  >
                    {o.status?.toLowerCase()}
                  </span>
                  {o.payment_method === "COD" && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      COD
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {o.created_at ? formatDate(o.created_at) : "—"}
                  </span>
                  <span>·</span>
                  <span>
                    {o.items.reduce((s, i) => s + i.quantity, 0)}{" "}
                    {o.items.length === 1 ? "item" : "items"}
                  </span>
                  {o.tracking_number && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-purple-600">
                        <Truck className="w-3.5 h-3.5" /> {o.tracking_number}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 sm:text-right w-full sm:w-auto justify-between sm:justify-end">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider">Total Amount</p>
                  <p className="font-bold text-lg text-neutral-900">{inr(o.total)}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
