"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ChevronRight, LogIn, ShieldAlert, ArrowLeft, ExternalLink, Calendar, MapPin, CreditCard, Tag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  currency: string;
  payment_method?: string;
  payment_status?: string;
  shipping_address: {
    name: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  notes?: string;
  created_at: string;
  items: OrderItem[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

const inr = (n: number) => `₹${Math.round(n / 100).toLocaleString("en-IN")}`;

export default function CustomerOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    apiClient
      .get<{ items: OrderDetail[] }>("/orders/?page=1&page_size=50")
      .then((data) => {
        setOrders(data.items || []);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load orders");
      })
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
          href="/login"
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
                <h1 className="text-2xl font-bold tracking-tight">#{o.id.slice(0, 8).toUpperCase()}</h1>
              </div>
              <div>
                <span className={`inline-block text-sm px-3 py-1 rounded-full border font-medium capitalize ${STATUS_STYLES[o.status] || "bg-neutral-100 text-neutral-700 border-neutral-200"}`}>
                  {o.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-sm">
              <div>
                <span className="text-neutral-400 block">Date Placed</span>
                <span className="font-semibold text-neutral-800">
                  {new Date(o.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Payment Method</span>
                <span className="font-semibold text-neutral-800 uppercase">{o.payment_method || "COD"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Payment Status</span>
                <span className="font-semibold text-neutral-800 uppercase text-xs">{o.payment_status || "PENDING"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Estimated Delivery</span>
                <span className="font-semibold text-neutral-800">1–2 business days</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Items */}
            <div>
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-neutral-400" /> Items Summary
              </h3>
              <div className="divide-y divide-neutral-100 border-y border-neutral-100">
                {o.items.map((item) => (
                  <div key={item.id} className="py-4 flex justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-neutral-900">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-neutral-500 mt-0.5">Variant: {item.variant_name}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-1">Qty {item.quantity} × {inr(item.unit_price)}</p>
                    </div>
                    <span className="font-semibold text-neutral-800 shrink-0">{inr(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & Meta */}
            <div className="grid sm:grid-cols-2 gap-8 pt-4">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-neutral-400" /> Shipping Address
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  <span className="font-semibold text-neutral-900 block mb-1">{o.shipping_address.name}</span>
                  {o.shipping_address.street}<br />
                  {o.shipping_address.city}, {o.shipping_address.state} — {o.shipping_address.postal_code}<br />
                  {o.shipping_address.phone && `Phone: ${o.shipping_address.phone}`}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-2xl p-5 text-sm space-y-3">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-neutral-800">{inr(o.subtotal)}</span>
                </div>
                {o.discount_total > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
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
          <Link
            href={`/order-tracking?orderId=${o.id}`}
            className="h-12 inline-flex items-center justify-center px-8 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors"
          >
            Track Order Status
          </Link>
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

      {error && <div className="rounded-3xl border border-neutral-100 p-6 text-sm text-neutral-500 bg-red-50/20">{error}</div>}

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
              className="border border-neutral-200 rounded-3xl p-6 bg-white hover:border-neutral-950 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-lg">#{o.id.slice(0, 8).toUpperCase()}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[o.status] || "bg-neutral-50 text-neutral-600 border-neutral-200"}`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>·</span>
                  <span>{o.items.length} {o.items.length === 1 ? "item" : "items"}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 sm:text-right w-full sm:w-auto justify-between sm:justify-end">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider">Total Amount</p>
                  <p className="font-bold text-lg text-neutral-900">{inr(o.total)}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-900" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
