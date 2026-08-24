"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Package, Search, RefreshCw, AlertCircle, PlusCircle, Star, Archive, RotateCcw, Pencil } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { ProductStatusBadge, StockBadge } from "@/components/admin/status-badges";
import { Pagination } from "@/components/admin/Pagination";
import { toast } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";

const PAGE_SIZE = 15;

interface ProductMedia {
  id: string;
  media_url: string;
  position: number;
  alt_text?: string | null;
}

interface ProductVariant {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
}

interface Product {
  id: string;
  name: string;
  slug?: string | null;
  sku?: string | null;
  brand?: string | null;
  category_id?: string | null;
  price: number;
  mrp?: number | null;
  sale_price?: number | null;
  status?: string | null;
  featured?: boolean;
  media?: ProductMedia[] | null;
  variants?: ProductVariant[] | null;
  created_at?: string;
}

interface InventoryRow {
  product_id: string;
  available: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

const STATUS_FILTERS = ["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Map<string, InventoryRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsRes, inventoryRes] = await Promise.allSettled([
        apiClient.get<Product[]>("/products/"),
        apiClient.get<{ items: InventoryRow[] }>("/inventory?page_size=999"),
      ]);
      if (productsRes.status === "fulfilled") {
        setProducts(Array.isArray(productsRes.value) ? productsRes.value : []);
      } else {
        const err = productsRes.reason;
        setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load products");
      }
      if (inventoryRes.status === "fulfilled") {
        const map = new Map<string, InventoryRow>();
        for (const row of (inventoryRes.value?.items || [])) map.set(row.product_id, row);
        setStock(map);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== "ALL" && (p.status || "ACTIVE").toUpperCase() !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q)
      );
    });
  }, [products, search, statusFilter]);

  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const patchProduct = async (id: string, patch: Record<string, unknown>, successMsg: string) => {
    setBusyId(id);
    try {
      const updated = await apiClient.put<Product>(`/products/${id}`, patch);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      toast.success(successMsg);
    } catch (err) {
      const message = err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Update failed";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const thumbFor = (p: Product): string | null => {
    const media = [...(p.media || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
    return media[0]?.media_url || null;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-amber-500" />
            Product Catalog
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage catalog items, pricing, offers and stock across your {BRAND_CONFIG.name} store.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700"
          >
            <PlusCircle className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU or brand..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Package className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-lg font-bold text-neutral-900">No products found</h3>
            <p className="text-sm text-neutral-500">
              {search || statusFilter !== "ALL"
                ? "No products match the current filters."
                : `Create your first product catalog entry in ${BRAND_CONFIG.name} to get started.`}
            </p>
          </div>
          {!search && statusFilter === "ALL" && (
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700"
            >
              <PlusCircle className="h-4 w-4" /> Add Product
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/60 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">Brand</th>
                  <th className="px-5 py-3.5 text-right">Price / MRP</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((product) => {
                  const inv = stock.get(product.id);
                  const archived = (product.status || "ACTIVE").toUpperCase() === "ARCHIVED";
                  const thumb = thumbFor(product);
                  const onOffer = product.sale_price != null && product.sale_price > 0;
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt={product.name} className="h-full w-full object-contain" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/products/${product.id}`}
                              className="block max-w-[220px] truncate font-semibold text-neutral-900 hover:text-amber-600 transition-colors"
                            >
                              {product.name}
                            </Link>
                            <div className="flex items-center gap-1.5">
                              {product.featured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                              {(product.variants?.length || 0) > 0 && (
                                <span className="text-[10px] text-neutral-400">
                                  {product.variants!.length} variant{product.variants!.length === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-neutral-500">{product.sku || "—"}</td>
                      <td className="px-5 py-3.5 text-neutral-600">{product.brand || "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-semibold text-neutral-900">
                          {formatINR(onOffer ? product.sale_price! : product.price)}
                        </div>
                        {product.mrp != null && product.mrp > (onOffer ? product.sale_price! : product.price) && (
                          <div className="text-xs text-neutral-400 line-through">{formatINR(product.mrp)}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {inv ? (
                          <StockBadge available={inv.available} isLowStock={inv.is_low_stock} isOutOfStock={inv.is_out_of_stock} />
                        ) : (
                          <StockBadge available={0} isOutOfStock />
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <ProductStatusBadge status={product.status || "ACTIVE"} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${product.id}`}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                            title="Edit product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() =>
                              patchProduct(
                                product.id,
                                { featured: !product.featured },
                                product.featured ? "Removed from featured" : "Marked as featured"
                              )
                            }
                            disabled={busyId === product.id}
                            className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
                              product.featured
                                ? "text-amber-400 hover:bg-amber-50"
                                : "text-neutral-300 hover:bg-neutral-100 hover:text-amber-400"
                            }`}
                            title={product.featured ? "Unfeature" : "Feature"}
                          >
                            <Star className={`h-4 w-4 ${product.featured ? "fill-amber-400" : ""}`} />
                          </button>
                          <button
                            onClick={() =>
                              patchProduct(
                                product.id,
                                { status: archived ? "ACTIVE" : "ARCHIVED" },
                                archived ? "Product restored" : "Product archived"
                              )
                            }
                            disabled={busyId === product.id}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors disabled:opacity-40"
                            title={archived ? "Restore product" : "Archive product"}
                          >
                            {archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={filtered.length} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
