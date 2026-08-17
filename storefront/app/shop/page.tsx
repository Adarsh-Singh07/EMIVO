"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/site/ProductCard";
import { CATEGORIES, PRODUCTS, mapStoreProduct, type Product } from "@/lib/products";
import { storeApi, type ProductListParams, type StoreCategory } from "@/lib/store-api";
import { SlidersHorizontal, ArrowUpDown, X, Search, ChevronLeft, ChevronRight, WifiOff } from "lucide-react";

const PAGE_SIZE = 12;

const SORT_VALUES = ["relevance", "price_asc", "price_desc", "newest", "discount"] as const;
type SortValue = (typeof SORT_VALUES)[number];

const SORT_OPTIONS: Array<{ label: string; value: SortValue }> = [
  { label: "Relevance", value: "relevance" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Newest first", value: "newest" },
  { label: "Biggest discount", value: "discount" },
];

/** Skeleton card placeholder */
function ProductSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-100 p-2 sm:p-3 animate-pulse">
      <div className="aspect-square rounded-xl bg-neutral-100 mb-3" />
      <div className="h-3 bg-neutral-100 rounded w-1/3 mb-2" />
      <div className="h-4 bg-neutral-100 rounded w-3/4 mb-2" />
      <div className="h-4 bg-neutral-100 rounded w-1/2" />
    </div>
  );
}

function ShopContent() {
  const router = useRouter();
  const sp = useSearchParams();

  // Single source of truth: the URL. Local state mirrors it for inputs.
  const q = sp.get("q") ?? "";
  const category = sp.get("category") ?? "";
  const rawSort = sp.get("sort") ?? "relevance";
  const sort: SortValue = (SORT_VALUES as readonly string[]).includes(rawSort)
    ? (rawSort as SortValue)
    : "relevance";
  const minPrice = sp.get("min_price") ?? "";
  const maxPrice = sp.get("max_price") ?? "";
  const inStockOnly = sp.get("in_stock") === "1";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);

  const [minDraft, setMinDraft] = useState(minPrice);
  const [maxDraft, setMaxDraft] = useState(maxPrice);

  useEffect(() => {
    setMinDraft(minPrice);
    setMaxDraft(maxPrice);
  }, [minPrice, maxPrice]);

  const setParam = useCallback(
    (updates: Record<string, string | null>, keepPage = false) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      });
      // Any filter change restarts pagination unless explicitly kept.
      if (!keepPage) next.delete("page");
      router.push(`/shop${next.toString() ? `?${next.toString()}` : ""}`, { scroll: true });
    },
    [router, sp]
  );

  /* ------------------------- Data fetching ------------------------- */
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const fetchKey = `${q}|${category}|${sort}|${minPrice}|${maxPrice}|${inStockOnly}|${page}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    storeApi
      .listProducts({
        q: q || undefined,
        category: category || undefined,
        sort,
        min_price: minPrice ? Number(minPrice) * 100 : undefined,
        max_price: maxPrice ? Number(maxPrice) * 100 : undefined,
        in_stock: inStockOnly || undefined,
        page,
        page_size: PAGE_SIZE,
      } satisfies ProductListParams)
      .then((data) => {
        if (cancelled) return;
        setProducts(data.items.map(mapStoreProduct));
        setTotal(data.total);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
        setOffline(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Offline fallback: filter the static catalog client-side.
        const list = PRODUCTS.filter((p) => {
          if (category && p.category !== category) return false;
          if (q) {
            const hay = `${p.name} ${p.brand} ${p.category} ${p.tagline}`.toLowerCase();
            if (!hay.includes(q.toLowerCase())) return false;
          }
          if (minPrice && p.price < Number(minPrice) * 100) return false;
          if (maxPrice && p.price > Number(maxPrice) * 100) return false;
          if (inStockOnly && !p.inStock) return false;
          return true;
        });
        if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
        if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
        if (sort === "discount") list.sort((a, b) => b.discount - a.discount);
        setProducts(list);
        setTotal(list.length);
        setHasNext(false);
        setHasPrev(false);
        setOffline(true);
        setError(err instanceof Error ? err.message : "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  /* ------------------------- Categories ------------------------- */
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    storeApi
      .getCategories()
      .then((cats) => {
        if (!cancelled && Array.isArray(cats) && cats.length > 0) setCategories(cats);
      })
      .catch(() => {
        /* keep static CATEGORIES */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryChips = useMemo(() => {
    if (categories.length > 0) {
      return [
        { slug: "", name: "All" },
        ...categories.map((c) => ({ slug: c.slug, name: c.name })),
      ];
    }
    return [{ slug: "", name: "All" }, ...CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))];
  }, [categories]);

  const activeFilterCount =
    (category ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (inStockOnly ? 1 : 0) + (sort !== "relevance" ? 1 : 0);

  const applyPrice = () => {
    const min = minDraft.trim() && /^\d+$/.test(minDraft.trim()) ? minDraft.trim() : "";
    const max = maxDraft.trim() && /^\d+$/.test(maxDraft.trim()) ? maxDraft.trim() : "";
    if (min && max && Number(min) > Number(max)) {
      setParam({ min_price: max, max_price: min });
      return;
    }
    setParam({ min_price: min || null, max_price: max || null });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [searchDraft, setSearchDraft] = useState(q);
  useEffect(() => setSearchDraft(q), [q]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link href="/">Home</Link> /{" "}
        <span className="text-neutral-900 capitalize">
          {category ? categoryChips.find((c) => c.slug === category)?.name || category : "Shop"}
        </span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight capitalize">
            {category ? categoryChips.find((c) => c.slug === category)?.name || category : "All Products"}
          </h1>
          <p className="text-neutral-500 mt-2">
            {q ? (
              <>
                {loading ? "Searching…" : `${total} result${total === 1 ? "" : "s"}`} for{" "}
                <span className="text-neutral-900 font-medium">&quot;{q}&quot;</span>{" "}
                <Link href="/shop" className="text-neutral-950 underline underline-offset-2">
                  Clear
                </Link>
              </>
            ) : loading ? (
              "Loading…"
            ) : (
              `${total} product${total === 1 ? "" : "s"}`
            )}
          </p>
        </div>

        {/* Search box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: searchDraft.trim() || null });
          }}
          className="flex items-stretch w-full max-w-md"
        >
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search in store"
            aria-label="Search products"
            className="flex-1 min-w-0 h-11 rounded-l-full border border-neutral-300 border-r-0 px-5 text-sm outline-none focus:border-neutral-950"
          />
          <button
            type="submit"
            aria-label="Search"
            className="h-11 px-5 rounded-r-full bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {offline && !loading && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          Live catalog is unreachable{error ? ` (${error})` : ""} — showing the offline catalog.
        </div>
      )}

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        {categoryChips.map((c) => (
          <Link
            key={c.slug || "all"}
            href={c.slug ? `/shop?category=${c.slug}` : "/shop"}
            className={`shrink-0 px-4 h-9 inline-flex items-center rounded-full border text-sm font-medium transition-colors ${
              category === c.slug
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block space-y-8">
          <div>
            <h3 className="font-semibold mb-3">Price (₹)</h3>
            <div className="flex items-center gap-2">
              <input
                value={minDraft}
                onChange={(e) => setMinDraft(e.target.value.replace(/\D/g, ""))}
                onBlur={applyPrice}
                onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                placeholder="Min"
                inputMode="numeric"
                aria-label="Minimum price"
                className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-sm focus:outline-none focus:border-neutral-950"
              />
              <span className="text-neutral-300">—</span>
              <input
                value={maxDraft}
                onChange={(e) => setMaxDraft(e.target.value.replace(/\D/g, ""))}
                onBlur={applyPrice}
                onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                placeholder="Max"
                inputMode="numeric"
                aria-label="Maximum price"
                className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-sm focus:outline-none focus:border-neutral-950"
              />
            </div>
            <button
              onClick={applyPrice}
              className="mt-3 h-9 px-4 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800"
            >
              Apply
            </button>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Availability</h3>
            <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setParam({ in_stock: e.target.checked ? "1" : null })}
                className="accent-neutral-950 w-4 h-4"
              />
              In stock only
            </label>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => router.push("/shop")}
              className="text-xs font-medium text-neutral-500 underline underline-offset-2"
            >
              Clear all filters
            </button>
          )}
        </aside>

        {/* Product grid */}
        <div className="min-w-0">
          {/* Mobile toolbar */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-500">{loading ? "Loading…" : `${total} products`}</p>
            <div className="flex items-center gap-2">
              <label className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 text-sm font-medium text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setParam({ in_stock: e.target.checked ? "1" : null })}
                  className="accent-neutral-950 w-3.5 h-3.5"
                />
                In stock
              </label>
            </div>
          </div>

          {/* Desktop sort select */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <p className="text-sm text-neutral-500">
              {hasNext || hasPrev
                ? `Page ${page} of ${totalPages}`
                : `${total} product${total === 1 ? "" : "s"}`}
            </p>
            <label className="flex items-center gap-2 text-sm text-neutral-500">
              <ArrowUpDown className="w-4 h-4" />
              <select
                value={sort}
                onChange={(e) => setParam({ sort: e.target.value === "relevance" ? null : e.target.value })}
                className="h-10 border border-neutral-200 rounded-full px-4 text-sm focus:outline-none focus:border-neutral-950"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Mobile sort chips */}
          <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setParam({ sort: o.value === "relevance" ? null : o.value })}
                className={`shrink-0 px-3.5 h-9 rounded-full border text-sm font-medium ${
                  sort === o.value
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 text-neutral-600"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-neutral-200 rounded-3xl text-neutral-500">
              <SlidersHorizontal className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
              <p>No products match your filters.</p>
              <button
                onClick={() => router.push("/shop")}
                className="mt-6 h-10 px-6 inline-flex items-center gap-2 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* Pagination */}
              {(hasPrev || hasNext) && (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setParam({ page: String(page - 1) }, true)}
                    disabled={!hasPrev}
                    className="h-11 px-5 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-neutral-400"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-sm text-neutral-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setParam({ page: String(page + 1) }, true)}
                    disabled={!hasNext}
                    className="h-11 px-5 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-neutral-400"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1400px] mx-auto px-4 py-24 text-center text-neutral-500">
          Loading shop…
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
