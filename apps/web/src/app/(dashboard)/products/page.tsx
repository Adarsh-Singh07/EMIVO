"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package, Search, Tag, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sku?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  description?: string;
  variants?: ProductVariant[];
  created_at?: string;
}

interface PaginatedProductsResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi<PaginatedProductsResponse | Product[]>("/products/");
      if (Array.isArray(response)) {
        setProducts(response);
      } else if (response && Array.isArray(response.items)) {
        setProducts(response.items);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error("Failed to load products:", err);
      setError(err?.message || "Could not fetch products from ELEKTRIX API");
      toast.error("Failed to load product catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-amber-500" />
            Product Catalog
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage catalog items, variants, and pricing across your {BRAND_CONFIG.name} store.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadProducts}
            disabled={loading}
            className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/products/new">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name or SKU..."
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
              className="h-44 rounded-2xl bg-neutral-900/50 border border-neutral-800/50 p-5 flex flex-col justify-between animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-neutral-800 rounded-md" />
                <div className="h-4 w-1/2 bg-neutral-800/60 rounded-md" />
              </div>
              <div className="h-6 w-1/3 bg-neutral-800 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-12 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 text-amber-500">
            <Package className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-lg font-bold text-white">No products found</h3>
            <p className="text-sm text-neutral-400">
              {search
                ? `No products matched "${search}"`
                : `Create your first product catalog entry in ${BRAND_CONFIG.name} to get started.`}
            </p>
          </div>
          {!search && (
            <Link href="/products/new">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-300">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">SKU</th>
                  <th className="py-3.5 px-6 text-right">Price (Minor Units)</th>
                  <th className="py-3.5 px-6 text-right">Price (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-neutral-400 line-clamp-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-neutral-400">
                      {product.sku || "N/A"}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-neutral-400">
                      {product.price} paise
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-amber-400">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(product.price / 100)}
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
