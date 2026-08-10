"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api-client";
import { Users, Search, RefreshCw, AlertCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface PaginatedCustomersResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi<PaginatedCustomersResponse | Customer[]>("/customers/");
      if (Array.isArray(response)) {
        setCustomers(response);
      } else if (response && Array.isArray(response.items)) {
        setCustomers(response.items);
      } else {
        setCustomers([]);
      }
    } catch (err: any) {
      console.error("Failed to load customers:", err);
      setError(err?.message || "Could not fetch customers from ELEKTRIX API");
      toast.error("Failed to load customer directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-500" />
            Customer CRM
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            View and manage customer profiles in your {BRAND_CONFIG.name} business account.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadCustomers}
          disabled={loading}
          className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, email, or phone..."
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-neutral-900/80 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Main Content State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-neutral-900/50 border border-neutral-800/50 p-5 flex flex-col justify-between animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-5 w-2/3 bg-neutral-800 rounded-md" />
                <div className="h-4 w-1/2 bg-neutral-800/60 rounded-md" />
              </div>
              <div className="h-4 w-1/3 bg-neutral-800/40 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-12 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 text-amber-500">
            <Users className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-lg font-bold text-white">No customers found</h3>
            <p className="text-sm text-neutral-400">
              {search
                ? `No customers matched "${search}"`
                : `Customers who place orders or sign up will automatically appear here.`}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-300">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Customer Name</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">Phone Number</th>
                  <th className="py-3.5 px-6 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-white">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="hover:text-amber-400 transition-colors font-semibold"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-neutral-500" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-500" />
                        {customer.phone || "—"}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-neutral-500">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
