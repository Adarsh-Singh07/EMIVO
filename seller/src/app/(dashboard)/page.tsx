"use client";

import { useEffect, useState, useCallback } from "react";
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
  Store
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
  const [sellerName, setSellerName] = useState("Seller");
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

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
              <Store className="w-3.5 h-3.5" />
              Verified Marketplace Merchant
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {sellerName}
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-xl">
              Manage your product catalog, maintain on-hand inventory levels, and mark customer orders as packed for central dispatch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md hover:from-amber-300 hover:to-amber-400 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Add Product
            </a>
            <a
              href="/orders"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-all"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              Orders ({pendingOrders.length} pending)
            </a>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Products
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {loading ? "—" : products.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Listed across Elektrix categories</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Units in Stock
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {loading ? "—" : totalStock}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total inventory available for purchase</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Orders to Pack
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {loading ? "—" : pendingOrders.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Requires packaging & label prep</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Seller Score
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            4.9 / 5.0
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Top Tier Merchant Status</p>
        </div>
      </div>

      {/* Split Section: Pending Orders & Products Quick View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Orders to Pack */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900">Urgent Orders to Pack</h2>
            </div>
            <a href="/orders" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-5 flex-1 divide-y divide-slate-100">
            {loading ? (
              <p className="text-sm text-slate-400">Loading orders...</p>
            ) : pendingOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">All current orders packed!</p>
                <p className="text-xs text-slate-400 mt-0.5">New purchases from customers will appear here.</p>
              </div>
            ) : (
              pendingOrders.slice(0, 5).map((ord) => (
                <div key={ord.item_id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-semibold text-slate-900 truncate">{ord.product_name}</p>
                    <p className="text-xs text-slate-500">
                      Qty: {ord.quantity} &bull; City: {ord.customer_city || "India"} &bull; Order #{ord.order_number || ord.order_id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">{formatINR(ord.total)}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                      NEEDS PACKING
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Catalog Highlights */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900">Your Inventory</h2>
            </div>
            <a href="/products" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Manage inventory <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-5 flex-1 divide-y divide-slate-100">
            {loading ? (
              <p className="text-sm text-slate-400">Loading inventory...</p>
            ) : products.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Layers className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No products added yet</p>
                <a
                  href="/products/new"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add your first product
                </a>
              </div>
            ) : (
              products.slice(0, 5).map((prod) => (
                <div key={prod.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                      {prod.images && prod.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-xs text-slate-500">
                        {prod.category_name || "General"} &bull; Stock: {prod.stock} units
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">{formatINR(prod.price)}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      prod.stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}>
                      {prod.stock > 0 ? "IN STOCK" : "OUT OF STOCK"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
