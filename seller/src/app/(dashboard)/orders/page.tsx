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
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-neutral-800" />
            Orders & Packaging
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Fulfill items ordered from your seller inventory. Prepare packaging and mark as packed for courier dispatch.
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Central Dispatch Notice */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700 flex items-start sm:items-center gap-3">
        <Truck className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-neutral-900">Delhivery Central Dispatch:</strong> When an item is packaged and sealed, click <span className="font-semibold text-neutral-950 bg-neutral-200 px-1.5 py-0.5 rounded">Mark as Packed</span>. Elektrix central administration generates the Delhivery airway bill (AWB) and schedules courier pickup from your warehouse address.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, order #, city, or pincode..."
            className="w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === f
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {f === "ALL" ? "All Orders" : f === "PENDING" ? "Needs Packing" : "Packed"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Orders Table */}
      {loading && orders.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <Box className="w-9 h-9 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-neutral-900">No orders found</h3>
          <p className="text-xs text-neutral-500 mt-0.5 max-w-sm mx-auto">
            {search || statusFilter !== "ALL"
              ? "No orders match your filter criteria."
              : "When customers order products from your seller inventory, they will appear here for packaging."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Order / Date</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-center">Quantity</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3">Destination</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((item) => {
                  const isPending = item.fulfillment_status === "PENDING";
                  const isBusy = packingItemId === item.item_id;

                  return (
                    <tr key={item.item_id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-neutral-900 block">
                          #{item.order_number || item.order_id.slice(0, 8)}
                        </span>
                        <span className="text-[11px] text-neutral-400">
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
                        <span className="font-semibold text-neutral-900 block truncate max-w-[240px]">
                          {item.product_name}
                        </span>
                        {item.variant_name && (
                          <span className="text-xs text-neutral-500">{item.variant_name}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center font-bold text-neutral-900">
                        {item.quantity}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="font-bold text-neutral-900">{formatINR(item.total)}</span>
                        {item.quantity > 1 && (
                          <div className="text-[11px] text-neutral-400">
                            {formatINR(item.unit_price)} each
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{item.customer_city || "India"}</span>
                          {item.customer_pincode && (
                            <span className="text-neutral-400">({item.customer_pincode})</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Needs Packing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Packed
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 text-xs font-semibold text-white hover:bg-neutral-800 shadow-sm transition-colors disabled:opacity-50"
                          >
                            <Box className="w-3.5 h-3.5 text-amber-400" />
                            {isBusy ? "Packing..." : "Mark Packed"}
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400">Ready for Courier</span>
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
