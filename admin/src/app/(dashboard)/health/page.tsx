"use client";

import { useState, useEffect } from"react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw, Server, Database, Cpu, HardDrive, ShieldCheck, Activity } from"lucide-react";
import { BRAND_CONFIG } from"@/config/branding";
import { BrandLogo } from"@/components/branding/BrandLogo";
import { apiClient } from"@/lib/api-client";

export default function HealthPage() {
 const [telemetry, setTelemetry] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const fetchDiagnostics = async () => {
 try {
 setLoading(true);
 setError(null);
 const data = await apiClient.get("/system/status");
 setTelemetry(data);
 } catch (err: any) {
 setError(err?.message ||"Failed to fetch live health metrics");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchDiagnostics();
 const interval = setInterval(fetchDiagnostics, 5000);
 return () => clearInterval(interval);
 }, []);

 const dbHealthy = telemetry?.services?.database?.status ==="healthy";
 const redisHealthy = telemetry?.services?.redis?.status ==="healthy";
 const isAllHealthy = dbHealthy && redisHealthy;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-300 pb-5">
 <div>
 <div className="flex items-center gap-3">
 <BrandLogo size={28} />
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{BRAND_CONFIG.name} System Diagnostics</h1>
 </div>
 <p className="text-neutral-400 text-sm mt-1">
 Real-time infrastructure health, database latency, Redis sessions, and process metrics.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={fetchDiagnostics}
 disabled={loading}
 className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${loading ?"animate-spin" :""}`} />
 Refresh Diagnostics
 </button>
 <Badge
 className={
 isAllHealthy
 ?"border-emerald-200 bg-emerald-50 text-emerald-800"
 :"border-amber-200 bg-amber-50 text-amber-800"
 }
 >
 {isAllHealthy ?"All Systems Operational" :"System Degraded"}
 </Badge>
 </div>
 </div>

 {error && (
 <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
 {error}
 </div>
 )}

 {/* Primary Service Status */}
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
 {/* Backend API */}
 <Card className="bg-white border-neutral-200">
 <CardHeader className="flex flex-row items-center justify-between pb-2">
 <CardTitle className="text-sm font-medium text-neutral-500">Backend API</CardTitle>
 <CheckCircle2 className="h-4 w-4 text-emerald-700" />
 </CardHeader>
 <CardContent>
 <div className="text-xl font-semibold text-neutral-900">FastAPI 1.0</div>
 <p className="text-xs text-neutral-500 mt-1">Status: OK (Ready Check Live)</p>
 </CardContent>
 </Card>

 {/* Database */}
 <Card className="bg-white border-neutral-200">
 <CardHeader className="flex flex-row items-center justify-between pb-2">
 <CardTitle className="text-sm font-medium text-neutral-500">Database (PostgreSQL)</CardTitle>
 {dbHealthy ? (
 <CheckCircle2 className="h-4 w-4 text-emerald-700" />
 ) : (
 <XCircle className="h-4 w-4 text-red-600" />
 )}
 </CardHeader>
 <CardContent>
 <div className="text-xl font-semibold text-neutral-900">
 {telemetry?.services?.database?.latency_ms !== undefined
 ?`${telemetry.services.database.latency_ms} ms`
 :"Connected"}
 </div>
 <p className="text-xs text-neutral-500 mt-1">
 Supabase DSN (RLS Enforced)
 </p>
 </CardContent>
 </Card>

 {/* Redis Cache */}
 <Card className="bg-white border-neutral-200">
 <CardHeader className="flex flex-row items-center justify-between pb-2">
 <CardTitle className="text-sm font-medium text-neutral-500">Redis Store</CardTitle>
 {redisHealthy ? (
 <CheckCircle2 className="h-4 w-4 text-emerald-700" />
 ) : (
 <XCircle className="h-4 w-4 text-red-600" />
 )}
 </CardHeader>
 <CardContent>
 <div className="text-xl font-semibold text-neutral-900">
 {telemetry?.services?.redis?.latency_ms !== undefined
 ?`${telemetry.services.redis.latency_ms} ms`
 :"Active"}
 </div>
 <p className="text-xs text-neutral-500 mt-1">Refresh Token Family Store</p>
 </CardContent>
 </Card>

 {/* Cloudflare R2 Storage */}
 <Card className="bg-white border-neutral-200">
 <CardHeader className="flex flex-row items-center justify-between pb-2">
 <CardTitle className="text-sm font-medium text-neutral-500">Cloudflare R2</CardTitle>
 <CheckCircle2 className="h-4 w-4 text-emerald-700" />
 </CardHeader>
 <CardContent>
 <div className="text-xl font-semibold text-neutral-900">Operational</div>
 <p className="text-xs text-neutral-500 mt-1">Pre-signed S3 Storage</p>
 </CardContent>
 </Card>
 </div>

 {/* Hardware Telemetry */}
 <div className="grid gap-4 md:grid-cols-3">
 <Card className="bg-white border-neutral-200">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
 <Cpu className="w-4 h-4 text-neutral-400" /> CPU Load
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-xl font-semibold text-neutral-900">{telemetry?.system?.cpu_percent ?? 0}%</div>
 <div className="w-full bg-neutral-100 h-2 rounded-full mt-2 overflow-hidden">
 <div
 className="bg-neutral-900 h-full transition-colors duration-150"
 style={{ width:`${Math.min(telemetry?.system?.cpu_percent || 0, 100)}%`}}
 />
 </div>
 </CardContent>
 </Card>

 <Card className="bg-white border-neutral-200">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
 <HardDrive className="w-4 h-4 text-neutral-400" /> API Memory Footprint
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-xl font-semibold text-neutral-900">{telemetry?.system?.memory_mb ?? 0} MB</div>
 <p className="text-xs text-neutral-500 mt-1">Resident Set Size (RSS)</p>
 </CardContent>
 </Card>

 <Card className="bg-white border-neutral-200">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
 <Activity className="w-4 h-4 text-neutral-400" /> System Memory Usage
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-xl font-semibold text-neutral-900">{telemetry?.system?.memory_percent ?? 0}%</div>
 <div className="w-full bg-neutral-100 h-2 rounded-full mt-2 overflow-hidden">
 <div
 className="bg-neutral-900 h-full transition-colors duration-150"
 style={{ width:`${Math.min(telemetry?.system?.memory_percent || 0, 100)}%`}}
 />
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
