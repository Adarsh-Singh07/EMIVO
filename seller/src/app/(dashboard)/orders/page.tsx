"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  ShoppingCart, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Info,
  MapPin,
  Box
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

interface SellerOrderItem {
  order_id: string;
  order_number?: string;
  item_id: string;
  product_id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total: number;
  fulfillment_status: "PENDING" | "PACKED";
  customer_city?: string;
  customer_pincode?: string;
  created_at?: string;
}

const STATUS_FILTERS = ["ALL", "PENDING", "PACKED"] as const;

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [packingItemId, setPackingItemId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<SellerOrderItem[]>("/seller/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load seller orders";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.fulfillment_status !== statusFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        o.product_name.toLowerCase().includes(q) ||
        (o.order_number || "").toLowerCase().includes(q) ||
        (o.customer_city || "").toLowerCase().includes(q) ||
        (o.customer_pincode || "").includes(q)
      );
    });
  }, [orders, statusFilter, search]);

  const handleMarkPacked = async (orderId: string, itemId: string, productName: string) => {
    setPackingItemId(itemId);
    try {
      await apiClient.post(`/seller/orders/${orderId}/items/${itemId}/pack`);
      setOrders((prev) =>
        prev.map((o) => (o.item_id === itemId ? { ...o, fulfillment_status: "PACKED" } : o))
      );
      toast.success(`'${productName}' marked as PACKED. Ready for admin courier dispatch.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to mark item as packed";
      toast.error(msg);
    } finally {
      setPackingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-amber-500" />
            Orders & Packaging
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Fulfill items ordered from your seller inventory. Prepare packaging and mark as packed.
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Central Dispatch Notice */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start sm:items-center gap-3 shadow-sm">
        <Truck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-blue-950">Central Dispatch Protocol:</strong> When an order item is prepared, click <span className="font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Mark as Packed</span>. Elektrix central administration generates the Delhivery airway bill (AWB) and schedules courier pickup from your location.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, order #, city, or pincode..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                statusFilter === f
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "ALL" ? "All Orders" : f === "PENDING" ? "Needs Packing" : "Packed"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Orders Table */}
      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Box className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No orders found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== "ALL"
              ? "No orders match your filter criteria."
              : "When customers order products from your seller inventory, they will appear here for packaging."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Order / Date</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5 text-center">Quantity</th>
                  <th className="px-5 py-3.5 text-right">Price</th>
                  <th className="px-5 py-3.5">Destination</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isPending = item.fulfillment_status === "PENDING";
                  const isBusy = packingItemId === item.item_id;

                  return (
                    <tr key={item.item_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-900 block">
                          #{item.order_number || item.order_id.slice(0, 8)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Recent"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-900 block truncate max-w-[240px]">
                          {item.product_name}
                        </span>
                        {item.variant_name && (
                          <span className="text-xs text-slate-500">{item.variant_name}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                        {item.quantity}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="font-bold text-slate-900">{formatINR(item.total)}</span>
                        {item.quantity > 1 && (
                          <div className="text-[11px] text-slate-400">
                            {formatINR(item.unit_price)} each
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.customer_city || "India"}</span>
                          {item.customer_pincode && (
                            <span className="text-slate-400">({item.customer_pincode})</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Needs Packing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Packed (Awaiting Courier)
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {isPending ? (
                          <button
                            onClick={() =>
                              handleMarkPacked(item.order_id, item.item_id, item.product_name)
                            }
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
                          >
                            <Box className="w-3.5 h-3.5 text-amber-400" />
                            {isBusy ? "Packing..." : "Mark as Packed"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Ready for Delhivery</span>
                        )}
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
