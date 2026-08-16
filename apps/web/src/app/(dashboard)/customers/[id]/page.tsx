"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone, MapPin, Info } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

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

  useEffect(() => {
    async function loadCustomer() {
      if (!id) return;
      try {
        // NOTE: uses the shared API client (full base URL + bearer token + refresh),
        // replacing the previous raw fetch('/api/v1/...') that hit the Next.js origin.
        const data = await apiClient.get<Customer>(`/customers/${id}`);
        setCustomer(data);
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

  return (
    <div className="space-y-6">
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

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
