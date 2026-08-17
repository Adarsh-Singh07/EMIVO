"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Scale, Trash2, X, ShoppingBag, Loader2, Check, Minus } from "lucide-react";
import { useCompareIds, clearCompare, toggleCompare } from "@/lib/compare";
import { storeApi, type StoreProduct } from "@/lib/store-api";
import { useCart } from "@/components/site/CartProvider";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { productHref } from "@/lib/products";

const AVAILABILITY = ["In stock", "Low stock", "Out of stock"];

function availabilityOf(p: StoreProduct): number {
  if (!p.stock) return 0;
  if (!p.stock.in_stock || p.stock.available === 0) return 2;
  if (p.stock.available <= 5) return 1;
  return 0;
}

export default function ComparePage() {
  const ids = useCompareIds();
  const { add } = useCart();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const loaded: StoreProduct[] = [];
      const errored: string[] = [];
      await Promise.all(
        ids.map(async (id) => {
          try {
            loaded.push(await storeApi.getProduct(id));
          } catch {
            errored.push(id);
          }
        })
      );
      if (cancelled) return;
      // Preserve the order chosen by the user.
      const byId = new Map(loaded.map((p) => [p.id, p]));
      setProducts(ids.map((id) => byId.get(id)).filter((p): p is StoreProduct => Boolean(p)));
      setFailed(errored);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  /** Union of spec names across all products (stable order). */
  const specRows: Array<{ name: string; values: Array<string | undefined> }> = [];
  const specIndex = new Map<string, { name: string; values: Array<string | undefined> }>();
  products.forEach((p) => {
    (p.specs || []).forEach((s) => {
      let row = specIndex.get(s.name);
      if (!row) {
        row = { name: s.name, values: products.map(() => undefined) };
        specIndex.set(s.name, row);
        specRows.push(row);
      }
      row.values[products.indexOf(p)] = s.value;
    });
  });

  const removeItem = (id: string) => {
    // Shared toggle removes the id when present.
    toggleCompare(id);
  };

  const handleAddToCart = async (p: StoreProduct) => {
    if (!p.stock?.in_stock) {
      toast.error("This product is out of stock");
      return;
    }
    setAddingId(p.id);
    const ok = await add({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.effective_price,
      mrp: p.mrp,
      img: p.images?.[0],
    });
    if (ok) toast.success("Added to cart");
    setAddingId(null);
  };

  const cellCls = "px-3 py-3 text-sm align-top";

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Compare Products</h1>
          <p className="text-neutral-500 mt-2">
            {ids.length} of 4 slots used — pick up to 4 products to compare side by side.
          </p>
        </div>
        {products.length > 0 && (
          <button
            onClick={() => {
              clearCompare();
              toast.success("Compare list cleared");
            }}
            className="h-10 px-4 inline-flex items-center gap-2 border border-neutral-200 rounded-full text-sm font-medium hover:border-red-300 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" /> Clear all
          </button>
        )}
      </div>

      {loading && ids.length > 0 ? (
        <div className="overflow-x-auto rounded-3xl border border-neutral-200 animate-pulse">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[160px_repeat(4,minmax(140px,1fr))] gap-0">
              <div className="p-4" />
              {ids.map((id) => (
                <div key={id} className="p-4 space-y-3">
                  <div className="aspect-square rounded-xl bg-neutral-100" />
                  <div className="h-4 bg-neutral-100 rounded w-3/4" />
                  <div className="h-4 bg-neutral-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : ids.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-neutral-200 rounded-3xl">
          <Scale className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 mb-6">
            Your compare list is empty. Tap the compare icon on any product to add it here.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-neutral-950 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-neutral-800"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-neutral-200 -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="w-40 min-w-40 text-left text-xs uppercase tracking-wider text-neutral-400 font-medium px-3 py-3 border-b border-neutral-100">
                  Product
                </th>
                {products.map((p) => (
                  <th key={p.id} className={`${cellCls} border-b border-neutral-100 min-w-[150px]`}>
                    <div className="relative">
                      <button
                        onClick={() => removeItem(p.id)}
                        aria-label={`Remove ${p.name} from compare`}
                        className="absolute -top-1 -right-1 z-10 w-7 h-7 rounded-full bg-white border border-neutral-200 grid place-items-center text-neutral-400 hover:text-red-600 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <Link href={productHref({ id: p.id, slug: p.slug })} className="block group">
                        <span className="relative block aspect-square rounded-xl bg-neutral-100 overflow-hidden mb-3">
                          {p.images && p.images[0] ? (
                            <Image
                              src={p.images[0]}
                              alt={p.name}
                              fill
                              sizes="150px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : null}
                        </span>
                        <span className="block font-medium text-sm leading-snug line-clamp-2 text-left">
                          {p.name}
                        </span>
                      </Link>
                      <button
                        onClick={() => handleAddToCart(p)}
                        disabled={!p.stock?.in_stock || addingId === p.id}
                        className="mt-3 w-full h-10 inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingId === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShoppingBag className="w-3.5 h-3.5" />
                        )}
                        {p.stock?.in_stock ? "Add to Cart" : "Out of Stock"}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={`${cellCls} text-neutral-500 border-b border-neutral-100`}>Price</td>
                {products.map((p) => (
                  <td key={p.id} className={`${cellCls} border-b border-neutral-100`}>
                    <span className="font-semibold">{inr(p.effective_price)}</span>
                    {p.mrp && p.mrp > p.effective_price && (
                      <span className="block text-xs text-neutral-400 line-through">{inr(p.mrp)}</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="bg-neutral-50/50">
                <td className={`${cellCls} text-neutral-500 border-b border-neutral-100`}>Discount</td>
                {products.map((p) => (
                  <td key={p.id} className={`${cellCls} border-b border-neutral-100`}>
                    {p.discount_percent ? (
                      <span className="text-green-600 font-medium">{p.discount_percent}% off</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={`${cellCls} text-neutral-500 border-b border-neutral-100`}>Brand</td>
                {products.map((p) => (
                  <td key={p.id} className={`${cellCls} border-b border-neutral-100`}>
                    {p.brand || "—"}
                  </td>
                ))}
              </tr>
              <tr className="bg-neutral-50/50">
                <td className={`${cellCls} text-neutral-500 border-b border-neutral-100`}>Category</td>
                {products.map((p) => (
                  <td key={p.id} className={`${cellCls} border-b border-neutral-100 capitalize`}>
                    {p.category_name || p.category_slug || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={`${cellCls} text-neutral-500 border-b border-neutral-100`}>Availability</td>
                {products.map((p) => (
                  <td key={p.id} className={`${cellCls} border-b border-neutral-100`}>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        availabilityOf(p) === 2
                          ? "text-red-600"
                          : availabilityOf(p) === 1
                            ? "text-amber-600"
                            : "text-green-600"
                      }`}
                    >
                      {availabilityOf(p) === 0 && <Check className="w-3.5 h-3.5" />}
                      {availabilityOf(p) === 1 && <Minus className="w-3.5 h-3.5" />}
                      {AVAILABILITY[availabilityOf(p)]}
                      {availabilityOf(p) === 1 && p.stock ? ` (${p.stock.available})` : ""}
                    </span>
                  </td>
                ))}
              </tr>
              {specRows.map((row, ri) => (
                <tr key={row.name} className={ri % 2 ? "bg-neutral-50/50" : ""}>
                  <td className={`${cellCls} text-neutral-500 capitalize`}>{row.name}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={cellCls}>
                      {v || <span className="text-neutral-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {failed.length > 0 && (
        <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          {failed.length} product{failed.length > 1 ? "s" : ""} could not be loaded and{" "}
          {failed.length > 1 ? "were" : "was"} skipped.
        </p>
      )}
    </div>
  );
}
