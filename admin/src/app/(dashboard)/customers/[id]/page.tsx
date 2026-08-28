"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone, MapPin, Info, Edit3, X, Save } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes?: string | null;
  created_at: string;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });

  useEffect(() => {
    async function loadCustomer() {
      if (!id) return;
      try {
        const data = await apiClient.get<Customer>(`/customers/${id}`);
        setCustomer(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          notes: data.notes || ""
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          router.push("/customers");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Failed to fetch customer details");
      } finally {
        setLoading(false);
      }
    }
    loadCustomer();
  }, [id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      };
      const updated = await apiClient.put<Customer>(`/customers/${id}`, payload);
      setCustomer(updated);
      setIsEditing(false);
      toast.success("Customer details updated successfully");
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

  if (error || !customer) {
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
            <p className="text-sm text-neutral-500">Customer since {new Date(customer.created_at).toLocaleDateString("en-IN")}</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Edit3 className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {isEditing ? (
          <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Name</label>
                <input required type="text" className={inputCls} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input required type="email" className={inputCls} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="text" className={inputCls} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <textarea rows={3} className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea rows={2} className={inputCls} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: customer.name || "",
                    email: customer.email || "",
                    phone: customer.phone || "",
                    address: customer.address || "",
                    notes: customer.notes || ""
                  });
                }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
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
                </dt>
                <dd className="mt-1 text-sm text-neutral-900">{customer.email}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </dt>
                <dd className="mt-1 text-sm text-neutral-900">{customer.phone || "Not provided"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
                  <MapPin className="h-3.5 w-3.5" /> Address
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{customer.address || "Not provided"}</dd>
              </div>
              {customer.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-neutral-500">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{customer.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
        <p>
          Order history is not linked here yet — the orders API does not support filtering by customer record, only by the
          ordering user. Use the <Link href="/orders" className="font-semibold text-amber-600 underline underline-offset-2">Orders</Link>{" "}
          list and search by order number to find this customer&apos;s purchases.
        </p>
      </div>
    </div>
  );
}
