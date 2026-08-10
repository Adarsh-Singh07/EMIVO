"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api-client";
import { ShoppingBag, RefreshCw, AlertCircle, PlusCircle, Clock, CheckCircle2, Truck, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";

interface Order {
  id: string;
  total?: number;
  total_amount?: number;
  status: string;
  customer_id?: string;
  created_at: string;
}

interface PaginatedOrdersResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi<PaginatedOrdersResponse | Order[]>("/orders/");
      if (Array.isArray(response)) {
        setOrders(response);
      } else if (response && Array.isArray(response.items)) {
        setOrders(response.items);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error("Failed to load orders:", err);
      setError(err?.message || "Could not fetch orders from ELEKTRIX API");
      toast.error("Failed to load order processing queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "CONFIRMED":
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {s}
          </span>
        );
      case "PROCESSING":
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Truck className="w-3.5 h-3.5" />
            {s}
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RotateCcw className="w-3.5 h-3.5" />
            {s}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            {s}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-amber-500" />
            Orders & Checkout
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time order state transition engine for {BRAND_CONFIG.name}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadOrders}
            disabled={loading}
            className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/orders/new">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Main Content State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-neutral-900/50 border border-neutral-800/50 p-5 flex flex-col justify-between animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-5 w-2/3 bg-neutral-800 rounded-md" />
                <div className="h-4 w-1/2 bg-neutral-800/60 rounded-md" />
              </div>
              <div className="h-4 w-1/3 bg-neutral-800/40 rounded-md" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-12 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 text-amber-500">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-lg font-bold text-white">No orders recorded</h3>
            <p className="text-sm text-neutral-400">
              Orders created via POS or online checkout will appear here in real time.
            </p>
          </div>
          <Link href="/orders/new">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Order
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-300">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Total Amount</th>
                  <th className="py-3.5 px-6 text-right">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {orders.map((order) => {
                  const orderTotal = order.total !== undefined ? order.total : (order.total_amount || 0);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-4 px-6 font-mono text-xs text-white">
                        <Link
                          href={`/orders/${order.id}`}
                          className="hover:text-amber-400 font-semibold"
                        >
                          #{order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-amber-400">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(orderTotal / 100)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs text-neutral-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
