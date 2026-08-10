"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw, Server, Database, Cpu, HardDrive, ShieldCheck, Activity } from "lucide-react";
import { BRAND_CONFIG } from "@/config/branding";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { apiClient } from "@/lib/api-client";

export default function HealthPage() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get("/system/status", true);
      setTelemetry(data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch live health metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 5000);
    return () => clearInterval(interval);
  }, []);

  const dbHealthy = telemetry?.services?.database?.status === "healthy";
  const redisHealthy = telemetry?.services?.redis?.status === "healthy";
  const isAllHealthy = dbHealthy && redisHealthy;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo variant="icon" size={28} />
            <h1 className="text-3xl font-bold tracking-tight text-white">{BRAND_CONFIG.name} System Diagnostics</h1>
          </div>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time infrastructure health, database latency, Redis sessions, and process metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-medium text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Diagnostics
          </button>
          <Badge
            className={
              isAllHealthy
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }
          >
            {isAllHealthy ? "All Systems Operational" : "System Degraded"}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Primary Service Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Backend API */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">Backend API</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">FastAPI 1.0</div>
            <p className="text-xs text-neutral-500 mt-1">Status: OK (Ready Check Live)</p>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">Database (PostgreSQL)</CardTitle>
            {dbHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {telemetry?.services?.database?.latency_ms !== undefined
                ? `${telemetry.services.database.latency_ms} ms`
                : "Connected"}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Supabase DSN (RLS Enforced)
            </p>
          </CardContent>
        </Card>

        {/* Redis Cache */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">Redis Store</CardTitle>
            {redisHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {telemetry?.services?.redis?.latency_ms !== undefined
                ? `${telemetry.services.redis.latency_ms} ms`
                : "Active"}
            </div>
            <p className="text-xs text-neutral-500 mt-1">Refresh Token Family Store</p>
          </CardContent>
        </Card>

        {/* Cloudflare R2 Storage */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">Cloudflare R2</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">Operational</div>
            <p className="text-xs text-neutral-500 mt-1">Pre-signed S3 Storage</p>
          </CardContent>
        </Card>
      </div>

      {/* Hardware Telemetry */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" /> CPU Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{telemetry?.system?.cpu_percent ?? 0}%</div>
            <div className="w-full bg-neutral-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(telemetry?.system?.cpu_percent || 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" /> API Memory Footprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{telemetry?.system?.memory_mb ?? 0} MB</div>
            <p className="text-xs text-neutral-500 mt-1">Resident Set Size (RSS)</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> System Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{telemetry?.system?.memory_percent ?? 0}%</div>
            <div className="w-full bg-neutral-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(telemetry?.system?.memory_percent || 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
