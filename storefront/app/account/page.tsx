"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Heart, MapPin, CreditCard, LogIn, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";

const SECTIONS = [
  { icon: Package, title: "Orders", desc: "Track, return or re-order", href: "/account/orders" },
  { icon: LogIn, title: "Profile", desc: "Manage personal details", href: "/account/profile" },
  { icon: Heart, title: "Wishlist", desc: "Items you saved", href: "/account/wishlist" },
  { icon: MapPin, title: "Addresses", desc: "Saved delivery addresses", href: "/account/addresses" },
];


interface OrderSummary {
  id: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items: Array<{ product_name: string; quantity: number }>;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const inr = (n: number) => `₹${Math.round(n / 100).toLocaleString("en-IN")}`;

function OrdersSection({ canSeeOrders }: { canSeeOrders: boolean }) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canSeeOrders) return;
    setLoading(true);
    apiClient
      .get<{ items: OrderSummary[] }>("/orders?page=1&page_size=5")
      .then((data) => setOrders(data.items || []))
      .catch((err) => setError(err?.message || "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [canSeeOrders]);

  if (!canSeeOrders) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        <Link href="/order-tracking" className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl border border-neutral-100 animate-pulse bg-neutral-50" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-neutral-100 p-4 text-sm text-neutral-500">{error}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-neutral-400 text-sm">
          No orders yet.{" "}
          <Link href="/shop" className="text-neutral-700 font-medium underline underline-offset-2">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-950 text-white grid place-items-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {order.items[0]?.product_name || "Order"}
                  {order.items.length > 1 && ` +${order.items.length - 1} more`}
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{inr(order.total)}</p>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full border capitalize ${
                    STATUS_STYLES[order.status] ?? "bg-neutral-50 text-neutral-600 border-neutral-200"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { user, loading } = useAuth();

  const displayName =
    user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
      : null;

  // All authenticated users can see their orders
  const canSeeOrders = !!user;


  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">My account</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-8">
        {user ? `Welcome back, ${user.first_name || "there"}` : "Welcome to ELEKTRIX"}
      </h1>

      {/* Auth status banner */}
      {!loading && !user ? (
        <div className="border border-neutral-200 rounded-3xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Sign in for a personalised experience</p>
            <p className="text-sm text-neutral-500 mt-1">Faster checkout, order tracking and exclusive offers.</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 h-12 px-6 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </Link>
        </div>
      ) : user ? (
        <div className="border border-neutral-200 rounded-3xl p-6 mb-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-neutral-950 text-white grid place-items-center text-xl font-bold shrink-0">
            {(user.first_name?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{displayName}</p>
            <p className="text-sm text-neutral-500">{user.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium capitalize">
              {user.role}
            </span>
          </div>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-3xl p-6 mb-10 animate-pulse">
          <div className="h-5 bg-neutral-100 rounded w-1/3 mb-2" />
          <div className="h-4 bg-neutral-100 rounded w-1/2" />
        </div>
      )}

      {/* Order History (for staff/owner/admin) */}
      <OrdersSection canSeeOrders={canSeeOrders} />

      {/* Track orders for all users */}
      {user && (
        <Link
          href="/order-tracking"
          className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-6 hover:border-neutral-950 transition-colors mb-4"
        >
          <div className="w-11 h-11 rounded-full bg-neutral-950 text-white grid place-items-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Track Order</h3>
            <p className="text-sm text-neutral-500">Enter your order ID to track delivery</p>
          </div>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-6 hover:border-neutral-950 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-neutral-950 text-white grid place-items-center shrink-0">
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-neutral-500">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
