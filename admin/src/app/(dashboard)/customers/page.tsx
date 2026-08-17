"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserCheck, Search, RefreshCw, AlertCircle, Mail, Phone } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { BRAND_CONFIG } from "@/config/branding";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface CustomersPageData {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), page_size: "15" });
      if (search.trim()) params.set("search", search.trim());
      const res = await apiClient.get<CustomersPageData>(`/customers/?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const items = data?.items || [];
  const total = data?.total || 0;
  const pageCount = Math.max(Math.ceil(total / 15), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-amber-500" />
            Customers
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Customer directory for your {BRAND_CONFIG.name} store.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <UserCheck className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">No customers found</h3>
            <p className="text-sm text-neutral-500">
              {search ? `No customers matched "${search}".` : "Customers who place orders or sign up will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-neutral-50/60">
                    <td className="px-5 py-3.5">
                      <Link href={`/customers/${customer.id}`} className="font-semibold text-neutral-900 hover:text-amber-600 transition-colors">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        {customer.phone || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-400">
                      {new Date(customer.created_at).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
            <p className="text-xs text-neutral-500">{total.toLocaleString("en-IN")} total · Page {page}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pageCount}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
