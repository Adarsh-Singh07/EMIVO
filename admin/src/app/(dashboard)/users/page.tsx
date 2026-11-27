"use client";

import { useState, useEffect, useCallback } from"react";
import { Users, Search, RefreshCw, AlertCircle, ShieldBan, ShieldCheck, Trash2, X } from"lucide-react";
import { apiClient, ApiError } from"@/lib/api-client";
import { RoleBadge } from"@/components/admin/status-badges";
import { Pagination } from"@/components/admin/Pagination";

const PAGE_SIZE = 15;

interface AdminUser {
 id: string;
 email: string;
 first_name: string;
 last_name: string;
 is_active: boolean;
 suspended: boolean;
 suspension_reason: string | null;
 roles: string[];
 created_at: string;
}

type PendingAction =
 | { kind:"suspend"; user: AdminUser }
 | { kind:"delete"; user: AdminUser }
 | null;

interface AdminUsersPageData {
 items: AdminUser[];
 total: number;
 page: number;
 page_size: number;
}

export default function UsersPage() {
 const [data, setData] = useState<AdminUsersPageData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState("");
 const [page, setPage] = useState(1);
 const [pending, setPending] = useState<PendingAction>(null);
 const [reason, setReason] = useState("");
 const [busy, setBusy] = useState(false);
 const [actionError, setActionError] = useState<string | null>(null);

 const runAction = async (fn: () => Promise<unknown>) => {
 setBusy(true);
 setActionError(null);
 try {
 await fn();
 setPending(null);
 setReason("");
 await load();
 } catch (err) {
 setActionError(
 err instanceof ApiError ?`${err.message}${err.code ?`(${err.code})`:""}`:"Action failed"
 );
 } finally {
 setBusy(false);
 }
 };

 const load = useCallback(async () => {
 try {
 setLoading(true);
 setError(null);
 const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
 if (search.trim()) params.set("q", search.trim());
 const res = await apiClient.get<AdminUsersPageData>(`/admin/users?${params.toString()}`);
 setData(res);
 } catch (err) {
 setError(err instanceof ApiError ?`${err.message}${err.code ?`(${err.code})`:""}`:"Failed to load users");
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
 const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);

 return (
 <div className="flex flex-col gap-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900 flex items-center gap-3">
 <Users className="w-8 h-8 text-neutral-500" />
 Users
 </h1>
 <p className="text-neutral-500 text-sm mt-1">Everyone with access to this store, with their roles.</p>
 </div>
 <button
 onClick={load}
 disabled={loading}
 className="inline-flex items-center gap-2 self-start rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${loading ?"animate-spin" :""}`} />
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
 placeholder="Search by name or email..."
 className="ex-input w-full pl-10 pr-4 rounded-md bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400"
 />
 </div>

 {error && (
 <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
 <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
 <p>{error}</p>
 </div>
 )}

 {/* Table */}
 {loading && !data ? (
 <div className="space-y-2">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="h-14 animate-pulse rounded-md border border-neutral-200 bg-white" />
 ))}
 </div>
 ) : items.length === 0 ? (
 <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
 <div className="flex h-16 w-16 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500">
 <Users className="h-8 w-8" />
 </div>
 <div>
 <h3 className="text-base font-semibold text-neutral-900">No users found</h3>
 <p className="text-sm text-neutral-500">{search ?`No users matched"${search}".`:"No users yet."}</p>
 </div>
 </div>
 ) : (
 <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-400">
 <tr>
 <th className="px-5 py-3.5">Name</th>
 <th className="px-5 py-3.5">Email</th>
 <th className="px-5 py-3.5">Roles</th>
 <th className="px-5 py-3.5">Status</th>
 <th className="px-5 py-3.5 text-right">Joined</th>
 <th className="px-5 py-3.5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100">
 {items.map((user) => {
 const initials =`${user.first_name?.[0] ||""}${user.last_name?.[0] ||""}`.toUpperCase() ||"U";
 return (
 <tr key={user.id} className="transition-colors hover:bg-neutral-50">
 <td className="px-5 py-3.5">
 <div className="flex items-center gap-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 text-xs font-semibold text-white">
 {initials}
 </div>
 <span className="font-semibold text-neutral-900">{`${user.first_name} ${user.last_name}`.trim() ||"—"}</span>
 </div>
 </td>
 <td className="px-5 py-3.5 text-neutral-600">{user.email}</td>
 <td className="px-5 py-3.5">
 <div className="flex flex-wrap gap-1.5">
 {user.roles?.length ? (
 [...new Set(user.roles)].map((role) => <RoleBadge key={role} role={role} />)
 ) : (
 <RoleBadge role="customer" />
 )}
 </div>
 </td>
 <td className="px-5 py-3.5">
 {user.suspended ? (
 <span
 className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
 title={user.suspension_reason || undefined}
 >
 Suspended
 </span>
 ) : (
 <span
 className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
 user.is_active
 ?"bg-emerald-50 text-emerald-700 border-emerald-200"
 :"bg-neutral-100 text-neutral-500 border-neutral-200"
 }`}
 >
 {user.is_active ?"Active" :"Disabled"}
 </span>
 )}
 </td>
 <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-400">
 {new Date(user.created_at).toLocaleDateString("en-IN")}
 </td>
 <td className="px-5 py-3.5">
 <div className="flex items-center justify-end gap-1.5">
 {user.email?.toLowerCase() ==="adarsh2001gop@gmail.com" ? (
 <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
 Master Admin
 </span>
 ) : user.roles?.some((r) => r !=="customer") ? (
 <span className="text-xs text-neutral-400">staff</span>
 ) : user.suspended ? (
 <button
 onClick={() => runAction(() => apiClient.post(`/admin/users/${user.id}/unsuspend`, {}))}
 disabled={busy}
 className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
 >
 <ShieldCheck className="h-3.5 w-3.5" /> Unsuspend
 </button>
 ) : (
 <>
 <button
 onClick={() => { setPending({ kind:"suspend", user }); setReason(""); }}
 disabled={busy || !user.is_active}
 className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
 >
 <ShieldBan className="h-3.5 w-3.5" /> Suspend
 </button>
 <button
 onClick={() => setPending({ kind:"delete", user })}
 disabled={busy || !user.is_active}
 className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
 >
 <Trash2 className="h-3.5 w-3.5" /> Delete
 </button>
 </>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
 </div>
 )}

 {/* Action error banner */}
 {actionError && (
 <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
 <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
 <p>{actionError}</p>
 </div>
 )}

 {/* Confirmation dialogs */}
 {pending && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 p-4">
 <div className="w-full max-w-md overflow-y-auto max-h-[85vh] rounded-md border border-neutral-200 bg-white p-6">
 {pending.kind ==="suspend" ? (
 <>
 <div className="flex items-start justify-between gap-3">
 <h3 className="text-base font-semibold text-neutral-900">
 Suspend {`${pending.user.first_name} ${pending.user.last_name}`.trim()}?
 </h3>
 <button onClick={() => setPending(null)} className="text-neutral-400 hover:text-neutral-700">
 <X className="h-5 w-5" />
 </button>
 </div>
 <p className="mt-2 text-sm text-neutral-600">
 They will be signed out everywhere and cannot log in until unsuspended.
 The reason below is shown to them at sign-in.
 </p>
 <textarea
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 rows={3}
 placeholder="Reason shown to the customer (e.g. fraudulent order activity)"
 className="ex-input mt-3 w-full rounded-md border border-neutral-200 p-3 text-sm"
 />
 <div className="mt-4 flex justify-end gap-2">
 <button onClick={() => setPending(null)} className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
 Cancel
 </button>
 <button
 onClick={() => runAction(() => apiClient.post(`/admin/users/${pending.user.id}/suspend`, { reason }))}
 disabled={busy || !reason.trim()}
 className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
 >
 Suspend account
 </button>
 </div>
 </>
 ) : (
 <>
 <div className="flex items-start justify-between gap-3">
 <h3 className="text-base font-semibold text-red-700">
 Permanently delete this account?
 </h3>
 <button onClick={() => setPending(null)} className="text-neutral-400 hover:text-neutral-700">
 <X className="h-5 w-5" />
 </button>
 </div>
 <p className="mt-2 text-sm text-neutral-600">
 <b>{`${pending.user.first_name} ${pending.user.last_name}`.trim()}</b> ({pending.user.email}) will be
 removed and signed out everywhere. Personal details are erased and cannot be
 restored. <b>Order and payment history is kept</b> for business records.
 </p>
 <div className="mt-4 flex justify-end gap-2">
 <button onClick={() => setPending(null)} className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
 Cancel
 </button>
 <button
 onClick={() => runAction(() => apiClient.delete(`/admin/users/${pending.user.id}`))}
 disabled={busy}
 className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
 >
 Delete permanently
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
