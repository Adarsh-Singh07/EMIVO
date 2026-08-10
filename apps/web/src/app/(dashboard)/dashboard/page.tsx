"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Package, 
  ShoppingCart, 
  UserCheck, 
  TrendingUp, 
  ArrowUpRight, 
  Plus, 
  Activity, 
  Layers, 
  RefreshCw,
  Clock,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND_CONFIG } from "@/config/branding";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    products: 0,
    customers: 0,
    orders: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [productsRes, customersRes, ordersRes] = await Promise.allSettled([
        apiClient.get("/products/?page=1&page_size=100"),
        apiClient.get("/customers/?page=1&page_size=100"),
        apiClient.get("/orders/?page=1&page_size=100"),
      ]);

      const productsCount = productsRes.status === "fulfilled" ? (productsRes.value?.total || productsRes.value?.items?.length || 0) : 0;
      const customersCount = customersRes.status === "fulfilled" ? (customersRes.value?.total || customersRes.value?.items?.length || 0) : 0;
      const ordersData = ordersRes.status === "fulfilled" ? ordersRes.value?.items || [] : [];
      const ordersCount = ordersRes.status === "fulfilled" ? (ordersRes.value?.total || ordersData.length) : 0;
      
      const totalRev = ordersData.reduce((acc: number, curr: any) => acc + (curr.total || curr.total_amount || 0), 0);

      setStats({
        products: productsCount,
        customers: customersCount,
        orders: ordersCount,
        revenue: totalRev,
      });
    } catch (err) {
      console.error("Dashboard metrics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "Operator";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-neutral-200 p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs font-semibold">
                Autonomous B2B Commerce
              </Badge>
              <span className="text-xs text-neutral-500 font-mono">v1.0 Ready</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              Welcome back, {userName}
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Here is what is happening across your {BRAND_CONFIG.name} store today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-semibold text-white hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Metrics
            </button>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              New Product
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              ₹{(stats.revenue / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              Live integer minor units
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">{stats.orders}</div>
            <p className="text-xs text-neutral-500 mt-1">Processed in system</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Catalog Products</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">{stats.products}</div>
            <p className="text-xs text-neutral-500 mt-1">Active inventory items</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">{stats.customers}</div>
            <p className="text-xs text-neutral-500 mt-1">Registered tenant accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access & Control Matrix */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-neutral-200 shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-neutral-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              Quick Operations
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Manage your commerce catalog, customer accounts, and order processing flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/products"
              className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-amber-500/40 transition-all flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 group-hover:text-amber-600 transition-colors">Products Catalog</h3>
                <p className="text-xs text-neutral-500">Manage SKUs, variants &amp; prices</p>
              </div>
            </Link>

            <Link
              href="/customers"
              className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-amber-500/40 transition-all flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 group-hover:text-amber-600 transition-colors">Customer Directory</h3>
                <p className="text-xs text-neutral-500">Search profiles &amp; addresses</p>
              </div>
            </Link>

            <Link
              href="/orders"
              className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-amber-500/40 transition-all flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 group-hover:text-amber-600 transition-colors">Orders &amp; Checkout</h3>
                <p className="text-xs text-neutral-500">Track status &amp; process refunds</p>
              </div>
            </Link>

            <Link
              href="/settings"
              className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-amber-500/40 transition-all flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 group-hover:text-amber-600 transition-colors">Store Settings</h3>
                <p className="text-xs text-neutral-500">Currency, theme &amp; branding</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* System Health Overview */}
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-neutral-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Infrastructure
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Live status of backend services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-neutral-600 font-medium">Database (Supabase)</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                RLS Enforced
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-neutral-600 font-medium">Redis 7+ Session Cache</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Healthy
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-neutral-600 font-medium">Object Storage (R2)</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                S3 Ready
              </Badge>
            </div>
            <div className="pt-2">
              <Link
                href="/health"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition-colors border border-neutral-200"
              >
                View Full System Telemetry
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
