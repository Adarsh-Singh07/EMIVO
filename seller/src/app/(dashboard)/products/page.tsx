"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Package, 
  Search, 
  PlusCircle, 
  RefreshCw, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  ExternalLink,
  Layers
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR, paiseToRupees } from "@/lib/money";
import { toast } from "sonner";

interface SellerProduct {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  brand?: string;
  price: number;
  mrp?: number;
  sale_price?: number;
  stock: number;
  status: string;
  category_id?: string;
  category_name?: string;
  parent_category_name?: string;
  images?: string[];
  created_at?: string;
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceRupees, setEditPriceRupees] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<SellerProduct[]>("/seller/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load seller catalog";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.category_name || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const startEdit = (p: SellerProduct) => {
    setEditingId(p.id);
    setEditPriceRupees(paiseToRupees(p.price));
    setEditStock(p.stock);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveQuickEdit = async (id: string) => {
    if (editPriceRupees < 1) {
      toast.error("Price must be greater than zero");
      return;
    }
    if (editStock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(`/seller/products/${id}`, {
        price: editPriceRupees,
        stock: editStock,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, price: editPriceRupees * 100, stock: editStock } : p
        )
      );
      toast.success("Price & stock updated successfully");
      setEditingId(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update item";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove '${name}' from your active inventory?`)) return;

    try {
      await apiClient.delete(`/seller/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product removed from inventory");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete product";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="w-7 h-7 text-amber-500" />
            Inventory & Products
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your pricing, available stock levels, and product offerings on Elektrix.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md hover:from-amber-300 hover:to-amber-400 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Add Product
          </a>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by product name, SKU, brand, or category..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Products Table */}
      {loading && products.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Layers className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No products found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? "No products match your search query." : "You have not listed any items in your inventory yet."}
          </p>
          {!search && (
            <a
              href="/products/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
            >
              <PlusCircle className="w-4 h-4" /> Add Product
            </a>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5 text-right">Price (₹)</th>
                  <th className="px-5 py-3.5 text-center">Stock</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => {
                  const isEditing = editingId === product.id;
                  const thumb = product.images && product.images[0];

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt={product.name} className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate max-w-[280px]">
                              {product.name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              {product.brand && <span>{product.brand}</span>}
                              {product.sku && <span className="font-mono">({product.sku})</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {product.parent_category_name ? (
                          <span>
                            <span className="text-slate-400">{product.parent_category_name} &rsaquo; </span>
                            <span className="font-medium text-slate-700">{product.category_name}</span>
                          </span>
                        ) : (
                          <span>{product.category_name || "General"}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <span className="text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              min="1"
                              value={editPriceRupees}
                              onChange={(e) => setEditPriceRupees(Number(e.target.value))}
                              className="w-20 rounded-lg border border-amber-500 px-2 py-1 text-right text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900">{formatINR(product.price)}</span>
                            {product.mrp && product.mrp > product.price && (
                              <div className="text-[11px] text-slate-400 line-through">
                                {formatINR(product.mrp)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editStock}
                            onChange={(e) => setEditStock(Number(e.target.value))}
                            className="w-16 rounded-lg border border-amber-500 px-2 py-1 text-center text-xs font-semibold focus:outline-none"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              product.stock > 5
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : product.stock > 0
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {product.stock} units
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {product.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveQuickEdit(product.id)}
                                disabled={saving}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Save changes"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(product)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                                title="Quick Edit Price & Stock"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <a
                                href={`https://elektrix.in/product/${product.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                title="View on Elektrix"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleDelete(product.id, product.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Remove product"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}
    </div>
  );
}
