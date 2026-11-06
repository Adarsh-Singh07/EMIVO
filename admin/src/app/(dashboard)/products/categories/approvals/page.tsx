"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, FolderTree, Clock, Store } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import Link from "next/link";

interface CategoryApprovalItem {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  parent_name?: string | null;
  requested_by_seller_id?: string | null;
  seller_name?: string | null;
  status: string;
  created_at?: string;
}

export default function CategoryApprovalsPage() {
  const [items, setItems] = useState<CategoryApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<CategoryApprovalItem[]>("/admin/categories/pending");
      setItems(data || []);
    } catch (err) {
      toast.error("Failed to load pending category requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    setBusyId(id);
    try {
      await apiClient.post(`/admin/categories/${id}/approve`, {});
      toast.success(`Category "${name}" approved successfully! It is now live platform-wide.`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error(`Failed to approve category "${name}"`);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setBusyId(id);
    try {
      await apiClient.post(`/admin/categories/${id}/reject`, {});
      toast.success(`Category "${name}" rejected.`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error(`Failed to reject category "${name}"`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            <Link href="/products/categories" className="hover:underline">Categories</Link>
            <span>/</span>
            <span>Approvals</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3 mt-1">
            <CheckCircle2 className="w-8 h-8 text-amber-500" />
            Category Approvals
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Review new categories and subcategories proposed by marketplace sellers before they go live on the storefront.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPending}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-neutral-200 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">All Caught Up!</h3>
          <p className="text-sm text-neutral-500 max-w-sm mt-1">
            There are currently no pending category requests awaiting admin approval.
          </p>
          <Link
            href="/products/categories"
            className="mt-5 text-sm font-semibold text-neutral-900 hover:underline inline-flex items-center gap-1"
          >
            View Active Categories &rarr;
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-6 py-4">Proposed Category</th>
                <th className="px-6 py-4">Hierarchy</th>
                <th className="px-6 py-4">Requested By</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-neutral-900 text-base">{item.name}</div>
                    <div className="text-xs font-mono text-neutral-400 mt-0.5">slug: {item.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    {item.parent_name ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-medium">
                        <FolderTree className="w-3.5 h-3.5 text-neutral-500" />
                        Subcategory under <strong>{item.parent_name}</strong>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                        Root / Top-Level Category
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-neutral-500" />
                      <span className="font-medium text-neutral-800">{item.seller_name || "Marketplace Seller"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recently"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleReject(item.id, item.name)}
                        disabled={busyId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all disabled:opacity-40"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(item.id, item.name)}
                        disabled={busyId === item.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold transition-all disabled:opacity-40"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
