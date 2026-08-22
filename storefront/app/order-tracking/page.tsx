"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, CheckCircle2, ChevronRight, MapPin, Clock, ExternalLink, Truck } from "lucide-react";
import { storeApi, type OrderV2 } from "@/lib/store-api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import Link from "next/link";
import { inr, formatDate } from "@/lib/format";

const STEPS = [
  { status: "PENDING", label: "Order placed" },
  { status: "PAYMENT_PENDING", label: "Payment pending" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PROCESSING", label: "Processing" },
  { status: "PACKED", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

function getActiveIndex(status: string) {
  const s = status.toUpperCase();
  const idx = STEPS.findIndex((st) => st.status === s);
  return idx >= 0 ? idx : 0;
}

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [order, setOrder] = useState<OrderV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const urlOrderNumber = searchParams.get("orderId") || "";

  const fetchOrder = useCallback(async (orderNumber: string) => {
    if (!orderNumber.trim()) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      // v0.2 tracking is by human-readable order number (e.g. ELK-YYMMDD-XXXXXX)
      // Allow guest tracking by order number
      const data = await storeApi.trackOrder(orderNumber.trim());
      setOrder(data);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "Order not found");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlOrderNumber) {
      setOrderNumberInput(urlOrderNumber);
      fetchOrder(urlOrderNumber);
    }
  }, [urlOrderNumber, fetchOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumberInput.trim()) {
      toast.error("Enter your order number");
      return;
    }
    fetchOrder(orderNumberInput);
  };

  const activeIndex = order ? getActiveIndex(order.status) : 0;
  const isCancelled = order && ["CANCELLED", "REFUNDED", "PAYMENT_FAILED"].includes(order.status.toUpperCase());
  const shippingAddr = order?.shipping_address;

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
        <Link href="/account" className="hover:text-neutral-900">
          My Account
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>Track Order</span>
      </div>
      <h1 className="text-4xl font-semibold tracking-tight mb-6">Track Your Order</h1>

      {authLoading ? (
        <div className="h-14 rounded-full bg-neutral-100 animate-pulse mb-10" />
      ) : (
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mb-10">
          <input
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value.toUpperCase())}
            placeholder="e.g. ELK-260816-4F2A9C"
            aria-label="Order number"
            className="h-12 flex-1 min-w-0 border border-neutral-200 rounded-full px-5 text-sm focus:outline-none focus:border-neutral-950"
          />
          <button
            type="submit"
            className="h-12 px-6 inline-flex items-center gap-2 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors shrink-0"
          >
            <Search className="w-4 h-4" /> Track
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-64 rounded-3xl border border-neutral-100 animate-pulse bg-neutral-50" />
      ) : searched && order ? (
        <div className="border border-neutral-200 rounded-3xl p-6 sm:p-8 bg-white space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400">Order number</p>
              <p className="font-bold text-lg">{order.order_number || order.id.slice(0, 8)}</p>
            </div>
            <span
              className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full border capitalize ${
                isCancelled
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "text-green-700 bg-green-50 border-green-200"
              }`}
            >
              {order.status.toLowerCase()}
            </span>
          </div>

          {/* Progress timeline */}
          {!isCancelled && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-4">
              {STEPS.map((s, i) => {
                const active = i <= activeIndex;
                const isLast = i === STEPS.length - 1;
                return (
                  <div
                    key={s.label}
                    className={`flex md:flex-col items-center gap-4 md:gap-2 flex-1 ${!isLast ? "md:relative" : ""}`}
                  >
                    <div className="flex items-center gap-2 md:flex-col">
                      <div
                        className={`w-10 h-10 rounded-full grid place-items-center shrink-0 border-2 transition-all ${
                          active
                            ? "bg-neutral-950 text-white border-neutral-950"
                            : "bg-neutral-50 text-neutral-400 border-neutral-200"
                        }`}
                      >
                        {i === 4 ? <CheckCircle2 className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>
                      <span className={`text-xs font-semibold ${active ? "text-neutral-900" : "text-neutral-400"}`}>
                        {s.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={`hidden md:block absolute left-[calc(50%+20px)] top-[20px] w-[calc(100%-40px)] h-0.5 transition-all ${
                          i < activeIndex ? "bg-neutral-950" : "bg-neutral-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isCancelled && (
            <p className="text-sm text-red-600 text-center py-2">
              This order was {order.status.toLowerCase()}.
            </p>
          )}

          {/* Tracking link */}
          {(order.tracking_number || order.tracking_url) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-neutral-50 border border-neutral-100 p-4">
              <div className="flex items-center gap-3 text-sm">
                <Truck className="w-5 h-5 text-neutral-400" />
                <span>
                  Tracking number:{" "}
                  <span className="font-semibold text-neutral-900">{order.tracking_number}</span>
                </span>
              </div>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 inline-flex items-center gap-2 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800"
                >
                  Track with carrier <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t border-neutral-100 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neutral-400" /> Delivery Address
              </h3>
              {shippingAddr ? (
                <p className="text-neutral-600 leading-relaxed pl-6">
                  <span className="font-medium text-neutral-800 block">
                    {shippingAddr.name || shippingAddr.full_name}
                  </span>
                  {shippingAddr.line1 || shippingAddr.street}
                  {shippingAddr.line2 ? `, ${shippingAddr.line2}` : ""}, {shippingAddr.city} —{" "}
                  {shippingAddr.pincode}
                </p>
              ) : (
                <p className="text-neutral-400 pl-6">Address unavailable</p>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" /> Order Summary
              </h3>
              <div className="pl-6 space-y-1 text-neutral-600">
                <p>
                  Placed:{" "}
                  <span className="font-medium text-neutral-800">
                    {order.created_at ? formatDate(order.created_at) : "—"}
                  </span>
                </p>
                <p>
                  Total: <span className="font-medium text-neutral-800">{inr(order.total)}</span>
                </p>
                <p>
                  Payment:{" "}
                  <span className="font-medium text-neutral-800">
                    {order.payment_method === "COD" ? "Cash on delivery" : "Paid online"}
                  </span>
                </p>
                {order.payment_status && (
                  <p>
                    Payment Status:{" "}
                    <span className={`font-medium capitalize ${order.payment_status === "SUCCESS" || order.payment_status === "PAID" ? "text-green-600" : order.payment_status === "FAILED" ? "text-red-600" : "text-amber-600"}`}>
                      {order.payment_status.toLowerCase()}
                    </span>
                  </p>
                )}
                {order.coupon_code && (
                  <p>
                    Coupon: <span className="font-medium text-neutral-800">{order.coupon_code}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Items</p>
            <div className="space-y-1.5 text-sm">
              {order.items.map((item, i) => (
                <div key={`${item.product_id}-${i}`} className="flex justify-between gap-4">
                  <span className="text-neutral-600">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="font-medium">{inr(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-neutral-400 text-center pt-2">
            Carrier tracking appears here once the shipment status changes to shipped.
          </p>
        </div>
      ) : searched ? (
        <div className="border border-neutral-200 rounded-3xl p-12 text-center text-neutral-500 bg-white">
          <p className="font-medium mb-1">No order found for &quot;{orderNumberInput}&quot;</p>
          <p className="text-sm text-neutral-400">
            Double-check the order number from your confirmation email and that you are signed in
            to the account used to place the order.
          </p>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-3xl p-12 text-center text-neutral-400 bg-neutral-50/50">
          <Clock className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
          <p className="text-sm">
            Enter your order number (from your confirmation) to track its fulfillment status.
          </p>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[800px] mx-auto px-4 py-20 text-center animate-pulse">
          <div className="h-6 bg-neutral-100 rounded w-1/4 mx-auto mb-4" />
          <div className="h-64 bg-neutral-100 rounded-3xl" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
