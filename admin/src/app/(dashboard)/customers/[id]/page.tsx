"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Mail, Phone, MapPin, Edit3, X, Save,
  Package, CreditCard, MapPinned, ShieldBan, ShieldCheck,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

type Customer = {
  id: string;
  customer_id?: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  suspended?: boolean | null;
  created_at: string;
};

type Overview = {
  profile: {
    id: string; email: string; first_name: string; last_name: string;
    phone: string | null; is_active: boolean; suspended: boolean;
    suspension_reason: string | null; is_email_verified: boolean;
    created_at: string;
    addresses: Array<Record<string, unknown>>;
  };
  orders: Array<{
    id: string; order_number: string; status: string; total: number;
    created_at: string; items: number;
  }>;
  payments: Array<{
    id: string; order_number: string | null; status: string;
    amount: number; currency: string; provider: string; created_at: string;
  }>;
  addresses: Array<{
    id: string; label: string; full_name: string; phone: string;
    line1: string; line2: string | null; city: string; state: string;
    pincode: string; is_default: boolean;
  }>;
};

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const StatusChip = ({ value }: { value: string }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${ORDER_STATUS_STYLES[value?.toLowerCase()] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
    {value || "—"}
  </span>
);

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state (CRM record only — exists when the legacy customers row does)
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", notes: "" });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      // Live 360 view: profile + orders + payments + addresses from the
      // users/orders/payments/addresses tables in real time.
      const data = await apiClient.get<Overview>(`/admin/customers/${id}/overview`);
      setOverview(data);
      const profile = data.profile;
      const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      setCustomer({
        id: profile.id,
        name: name || profile.email,
        email: profile.email,
        phone: profile.phone,
        address: null,
        notes: null,
        is_active: profile.is_active,
        suspended: profile.suspended,
        created_at: profile.created_at,
      });
      setFormData({ name, email: profile.email, phone: profile.phone || "", address: "", notes: "" });
      // Keep the CRM address/notes editable when the legacy record exists
      if (data.profile && (data.profile as unknown as { crm?: { address?: string; notes?: string } }).crm) {
        const crm = (data.profile as unknown as { crm: { address?: string; notes?: string } }).crm;
        setFormData((f) => ({ ...f, address: crm.address || "", notes: crm.notes || "" }));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.push("/customers");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to fetch customer details");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      // CRM notes/address live on the legacy customers record (if any)
      const updated = await apiClient.put<Customer>(`/customers/${id}`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      });
      setCustomer((c) => (c ? { ...c, ...updated } : updated));
      setIsEditing(false);
      toast.success("Customer details updated successfully");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-amber-500" />
      </div>
    );
  }

  if (error || !customer || !overview) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h3 className="text-sm font-bold text-red-800">Error</h3>
        <p className="mt-1.5 text-sm text-red-700">{error || "Customer not found"}</p>
        <Link href="/customers" className="mt-4 inline-block text-sm font-semibold text-red-800 underline hover:text-red-900">
          &larr; Back to customers
        </Link>
      </div>
    );
  }

  const profile = overview.profile;
  const inputCls = "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
  const labelCls = "mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wider";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/customers"
            className="rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{customer.name}</h1>
            <p className="text-sm text-neutral-500">
              Customer since {new Date(customer.created_at).toLocaleDateString("en-IN")}
              {profile.suspended && (
                <span className="ml-2 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                  <ShieldBan className="mr-1 h-3 w-3" /> Suspended{profile.suspension_reason ? `: ${profile.suspension_reason}` : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        {!isEditing && customer.customer_id !== undefined && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Edit3 className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {/* Profile */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {isEditing ? (
          <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Name</label>
                <input required type="text" className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input required type="email" className={inputCls} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="text" className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address (CRM note)</label>
                <textarea rows={3} className={inputCls} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea rows={2} className={inputCls} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => { setIsEditing(false); }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                {saving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 py-6 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
                  <Mail className="h-3.5 w-3.5" /> Email
                  {profile.is_email_verified && (
                    <span className="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">verified</span>
                  )}
                </dt>
                <dd className="mt-1 text-sm text-neutral-900">{profile.email}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </dt>
                <dd className="mt-1 text-sm text-neutral-900">{profile.phone || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-neutral-500">Account</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-neutral-900">
                  {profile.is_active ? <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>
                    : <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">Disabled</span>}
                  {profile.suspended && (
                    <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      <ShieldBan className="mr-1 h-3 w-3" /> Suspended
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
          <Package className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Orders ({overview.orders.length})</h2>
        </div>
        {overview.orders.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-400">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {overview.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/60">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-neutral-900">{o.order_number}</td>
                    <td className="px-5 py-3"><StatusChip value={o.status} /></td>
                    <td className="px-5 py-3 text-neutral-600">{o.items}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900">{inr(o.total)}</td>
                    <td className="px-5 py-3 text-right text-xs text-neutral-400">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
          <CreditCard className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Payments ({overview.payments.length})</h2>
        </div>
        {overview.payments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-400">No payment records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {overview.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/60">
                    <td className="px-5 py-3 font-mono text-xs text-neutral-900">{p.order_number || p.id.slice(0, 8)}</td>
                    <td className="px-5 py-3"><StatusChip value={p.status} /></td>
                    <td className="px-5 py-3 text-neutral-600 capitalize">{p.provider?.toLowerCase()}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900">{inr(p.amount)}</td>
                    <td className="px-5 py-3 text-right text-xs text-neutral-400">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
          <MapPinned className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Saved Addresses ({overview.addresses.length})</h2>
        </div>
        {overview.addresses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-400">No saved addresses.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {overview.addresses.map((a) => (
              <div key={a.id} className="rounded-xl border border-neutral-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900">{a.label}</span>
                  {a.is_default && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">DEFAULT</span>
                  )}
                </div>
                <p className="mt-1 text-neutral-700">{a.full_name} · {a.phone}</p>
                <p className="mt-0.5 text-neutral-500">
                  {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
