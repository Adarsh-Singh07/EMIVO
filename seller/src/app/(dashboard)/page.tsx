"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Star, 
  PlusCircle, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Layers,
  Store,
  Truck,
  ShieldCheck
} from "lucide-react";
import { apiClient, authStorage } from "@/lib/api-client";
import { formatINR } from "@/lib/money";

interface ProductItem {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  price: number;
  stock: number;
  status: string;
  category_name?: string | null;
  images?: string[];
}

interface OrderItem {
  order_id: string;
  order_number?: string;
  item_id: string;
  product_name: string;
  quantity: number;
  total: number;
  fulfillment_status: string;
  customer_city?: string;
}

export default function SellerDashboardPage() {
  const [sellerName, setSellerName] = useState("Merchant");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodsRes, ordsRes] = await Promise.allSettled([
        apiClient.get<ProductItem[]>("/seller/products"),
        apiClient.get<OrderItem[]>("/seller/orders"),
      ]);

      if (prodsRes.status === "fulfilled" && Array.isArray(prodsRes.value)) {
        setProducts(prodsRes.value);
      }
      if (ordsRes.status === "fulfilled" && Array.isArray(ordsRes.value)) {
        setOrders(ordsRes.value);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const s = authStorage.getSeller();
    if (s?.business_name) {
      setSellerName(s.business_name);
    }
    loadData();
  }, [loadData]);

  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const pendingOrders = orders.filter((o) => o.fulfillment_status === "PENDING");
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 5);

  return (
    <div className="space-y-6">
      {/* Executive Operational Header */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                ELEKTRIX Verified Merchant
              </span>
              <span className="text-xs text-neutral-400">Central Logistics</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Welcome, {sellerName}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-500 max-w-2xl">
              Fulfill customer orders, manage product stock levels, and monitor Delhivery warehouse pickup status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Product</span>
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-neutral-500" />
              <span>Orders to Pack ({pendingOrders.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Structured Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Active Listings
            </span>
            <Package className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            {loading ? "0" : products.length}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">Products active in Elektrix catalog</p>
        </div>

        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              On-Hand Inventory
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            {loading ? "0" : totalStock}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">Total units available for sale</p>
        </div>

        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Orders to Pack
            </span>
            <ShoppingCart className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            {loading ? "0" : pendingOrders.length}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">Awaiting packaging for pickup</p>
        </div>

        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Merchant Rating
            </span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            {(() => {
              const s = authStorage.getSeller() as any;
              return (s?.rating && s?.rating_count > 0) ? `${Number(s.rating).toFixed(1)} / 5.0` : "New Seller";
            })()}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 font-medium">
            {(() => {
              const s = authStorage.getSeller() as any;
              return (s?.rating && s?.rating_count > 0) ? `${s.rating_count} verified buyer ratings` : "No buyer ratings yet";
            })()}
          </p>
        </div>
      </div>

      {/* Two Column Operational Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Orders to Pack */}
        <div className="rounded-xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-neutral-900">Orders Requiring Packaging</h2>
            </div>
            <Link href="/orders" className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1 divide-y divide-neutral-100">
            {loading ? (
              <p className="text-xs text-neutral-400 py-6 text-center">Loading orders...</p>
            ) : pendingOrders.length === 0 ? (
              <div className="py-8 text-center text-neutral-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-neutral-800">All orders are packed and up to date</p>
                <p className="text-xs text-neutral-400 mt-0.5">New purchases from customers will appear here automatically.</p>
              </div>
            ) : (
              pendingOrders.slice(0, 5).map((ord) => (
                <div key={ord.item_id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{ord.product_name}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Qty: {ord.quantity} &bull; City: {ord.customer_city || "India"} &bull; Order #{ord.order_number || ord.order_id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-neutral-900">{formatINR(ord.total)}</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 mt-0.5">
                      NEEDS PACKING
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inventory Stock Status */}
        <div className="rounded-xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-neutral-700" />
              <h2 className="text-sm font-bold text-neutral-900">Inventory Stock Status</h2>
            </div>
            <Link href="/products" className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1">
              Manage inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {loading ? (
              <p className="text-xs text-neutral-400 py-6 text-center">Loading inventory...</p>
            ) : products.length === 0 ? (
              <div className="py-8 text-center text-neutral-400">
                <Store className="w-7 h-7 text-neutral-400 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-neutral-800">No active products in inventory</p>
                <p className="text-xs text-neutral-400 mt-0.5">List products or attach offers to start selling on Elektrix.</p>
                <Link
                  href="/products/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  Add First Product
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{lowStockProducts.length} product(s) are low on stock (5 units or fewer).</span>
                  </div>
                )}
                <div className="divide-y divide-neutral-100">
                  {products.slice(0, 5).map((prod) => (
                    <div key={prod.id} className="py-2.5 flex items-center justify-between">
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-semibold text-neutral-900 truncate">{prod.name}</p>
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          {prod.sku || "NO-SKU"} &bull; {prod.category_name || "General"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-neutral-900">{formatINR(prod.price)}</p>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                            prod.stock > 5
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : prod.stock > 0
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {prod.stock} in stock
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
