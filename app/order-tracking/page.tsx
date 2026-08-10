"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Package, Truck, CheckCircle2, ChevronRight, MapPin, Calendar, Clock } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import Link from "next/link";

interface OrderTrackingDetail {
  id: string;
  status: string;
  total: number;
  payment_method?: string;
  payment_status?: string;
  shipping_address: {
    name: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
  };
  created_at: string;
  items: Array<{ product_name: string; quantity: number }>;
}

const STEPS = [
  { status: "pending", label: "Order placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "processing", label: "Processing" },
  { status: "shipped", label: "In transit" },
  { status: "delivered", label: "Delivered" },
];

const inr = (n: number) => `₹${Math.round(n / 100).toLocaleString("en-IN")}`;

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [orderIdInput, setOrderIdInput] = useState("");
  const [order, setOrder] = useState<OrderTrackingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const urlOrderId = searchParams.get("orderId") || "";

  useEffect(() => {
    if (urlOrderId) {
      setOrderIdInput(urlOrderId);
      fetchOrder(urlOrderId);
    }
  }, [urlOrderId]);

  const fetchOrder = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiClient.get<OrderTrackingDetail>(`/orders/${id}`);
      setOrder(data);
    } catch (err: any) {
      setOrder(null);
      toast.error(err?.message || "Order not found or access denied");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim()) {
      toast.error("Enter your order ID");
      return;
    }
    // Update URL query param safely
    router.push(`/order-tracking?orderId=${orderIdInput.trim()}`);
  };

  // Determine active step index based on order.status
  const getActiveIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return 0;
    if (s === "confirmed") return 1;
    if (s === "processing") return 2;
    if (s === "shipped") return 3;
    if (s === "delivered") return 4;
    return 0; // default/cancelled/refunded doesn't map directly, we fallback to 0
  };

  const activeIndex = order ? getActiveIndex(order.status) : 0;

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

      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mb-10">
        <input
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          placeholder="e.g. 8-character Order ID or UUID"
          className="h-12 flex-1 border border-neutral-200 rounded-full px-5 text-sm focus:outline-none focus:border-neutral-950"
        />
        <button
          type="submit"
          className="h-12 px-6 inline-flex items-center gap-2 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors"
        >
          <Search className="w-4 h-4" /> Track
        </button>
      </form>

      {loading ? (
        <div className="h-64 rounded-3xl border border-neutral-100 animate-pulse bg-neutral-50" />
      ) : searched && order ? (
        <div className="border border-neutral-200 rounded-3xl p-6 sm:p-8 bg-white space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400">Order ID</p>
              <p className="font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full capitalize">
              {order.status}
            </span>
          </div>

          {/* Progress timeline */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-4">
            {STEPS.map((s, i) => {
              const active = i <= activeIndex;
              const isLast = i === STEPS.length - 1;
              return (
                <div key={s.label} className={`flex md:flex-col items-center gap-4 md:gap-2 flex-1 ${!isLast ? "md:relative" : ""}`}>
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

          <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t border-neutral-100 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neutral-400" /> Delivery Address
              </h3>
              <p className="text-neutral-600 leading-relaxed pl-6">
                <span className="font-medium text-neutral-800 block">{order.shipping_address.name}</span>
                {order.shipping_address.street}, {order.shipping_address.city} — {order.shipping_address.postal_code}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" /> Order Summary
              </h3>
              <div className="pl-6 space-y-1 text-neutral-600">
                <p>Placed: <span className="font-medium text-neutral-800">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></p>
                <p>Total: <span className="font-medium text-neutral-800">{inr(order.total)}</span></p>
                <p>Method: <span className="font-medium text-neutral-800 uppercase">{order.payment_method || "COD"}</span></p>
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-400 text-center pt-4">
            Carrier live tracking code will be available once the shipment status changes to shipped.
          </p>
        </div>
      ) : searched ? (
        <div className="border border-neutral-200 rounded-3xl p-12 text-center text-neutral-500 bg-white">
          <p className="font-medium mb-1">No order found with ID &quot;{orderIdInput}&quot;</p>
          <p className="text-sm text-neutral-400">Please make sure the ID matches your invoice and you are logged in to the correct account.</p>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-3xl p-12 text-center text-neutral-400 bg-neutral-50/50">
          <Clock className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
          <p className="text-sm">Enter your Order ID to track its real-time fulfillment status.</p>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[800px] mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-6 bg-neutral-100 rounded w-1/4 mx-auto mb-4" />
        <div className="h-64 bg-neutral-100 rounded-3xl" />
      </div>
    }>
      <OrderTrackingContent />
    </Suspense>
  );
}
