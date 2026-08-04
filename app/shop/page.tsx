"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/site/ProductCard";
import { PRODUCTS, CATEGORIES, BRANDS } from "@/lib/products";
import { SlidersHorizontal, ArrowUpDown, X, Check } from "lucide-react";

const PRICE_OPTIONS = [
  { label: "All Prices", value: "all" },
  { label: "Under ₹10,000", value: "under-10k" },
  { label: "₹10,000 – ₹25,000", value: "10-25k" },
  { label: "₹25,000 – ₹50,000", value: "25-50k" },
  { label: "Above ₹50,000", value: "over-50k" },
];

const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Biggest Discount", value: "discount" },
];

function ShopContent() {
  const sp = useSearchParams();
  const cat = sp.get("category") ?? "all";
  const query = (sp.get("q") ?? "").trim().toLowerCase();

  const [brands, setBrands] = useState<string[]>([]);
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = brands.length + (price !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => (cat === "all" ? true : p.category === cat));

    if (query) {
      list = list.filter((p) =>
        [p.name, p.brand, p.category, p.tagline].join(" ").toLowerCase().includes(query)
      );
    }

    if (brands.length) {
      list = list.filter((p) => brands.includes(p.brand));
    }

    if (price !== "all") {
      list = list.filter((p) => {
        if (price === "under-10k") return p.price < 10_000;
        if (price === "10-25k") return p.price >= 10_000 && p.price < 25_000;
        if (price === "25-50k") return p.price >= 25_000 && p.price < 50_000;
        return p.price >= 50_000;
      });
    }

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "discount":
        list = [...list].sort((a, b) => b.discount - a.discount);
        break;
      default:
        break;
    }

    return list;
  }, [cat, query, brands, price, sort]);

  const toggleBrand = (b: string) =>
    setBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link href="/">Home</Link> /{" "}
        <span className="text-neutral-900 capitalize">{cat === "all" ? "Shop" : cat}</span>
      </nav>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight capitalize">
            {cat === "all" ? "All Products" : cat}
          </h1>
          <p className="text-neutral-500 mt-2">
            {query ? (
              <>
                {filtered.length} results for{" "}
                <span className="text-neutral-900 font-medium">“{query}”</span>{" "}
                <Link href="/shop" className="text-neutral-950 underline underline-offset-2">
                  Clear
                </Link>
              </>
            ) : (
              `${filtered.length} products`
            )}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar filters (desktop only — mobile uses the Filter sheet) */}
        <aside className="hidden lg:block space-y-8">
          <div>
            <h3 className="font-semibold mb-3">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/shop"
                  className={
                    cat === "all" ? "font-medium text-neutral-950" : "text-neutral-500 hover:text-neutral-950"
                  }
                >
                  All
                </Link>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className={`capitalize ${
                      cat === c.slug
                        ? "font-medium text-neutral-950"
                        : "text-neutral-500 hover:text-neutral-950"
                    }`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Brands</h3>
            <ul className="space-y-2 text-sm">
              {BRANDS.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`b-${b}`}
                    checked={brands.includes(b)}
                    onChange={() => toggleBrand(b)}
                    className="accent-neutral-950"
                  />
                  <label htmlFor={`b-${b}`} className="text-neutral-600">
                    {b}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Price</h3>
            <ul className="space-y-2 text-sm">
              {PRICE_OPTIONS.map((o) => (
                <li key={o.value}>
                  <button
                    onClick={() => setPrice(o.value)}
                    className={
                      price === o.value
                        ? "font-medium text-neutral-950"
                        : "text-neutral-500 hover:text-neutral-950"
                    }
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Product grid */}
        <div>
          {/* Mobile toolbar */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-500">
              Showing {filtered.length} of {PRODUCTS.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOpen(true)}
                className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 text-sm font-medium text-neutral-800"
              >
                <ArrowUpDown className="w-4 h-4" /> Sort
              </button>
              <button
                onClick={() => setFilterOpen(true)}
                className="relative h-9 px-3.5 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 text-sm font-medium text-neutral-800"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-neutral-950 text-white text-[10px] font-semibold grid place-items-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop count + sort select */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <p className="text-sm text-neutral-500">
              Showing {filtered.length} of {PRODUCTS.length}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 border border-neutral-200 rounded-full px-4 text-sm focus:outline-none focus:border-neutral-950"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="discount">Biggest Discount</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-neutral-200 rounded-3xl text-neutral-500">
              No products match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sort bottom sheet (mobile only) */}
      {sortOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSortOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-base">Sort by</h3>
              <button
                onClick={() => setSortOpen(false)}
                aria-label="Close"
                className="p-1.5 -mr-1.5 rounded-full hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="divide-y divide-neutral-100">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    setSort(o.value);
                    setSortOpen(false);
                  }}
                  className="w-full flex items-center justify-between py-3.5 text-sm text-left"
                >
                  <span className={sort === o.value ? "font-semibold text-neutral-950" : "text-neutral-600"}>
                    {o.label}
                  </span>
                  {sort === o.value && <Check className="w-4 h-4 text-neutral-950" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter bottom sheet (mobile only) */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFilterOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">Filters</h3>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setBrands([]);
                      setPrice("all");
                    }}
                    className="text-xs font-medium text-neutral-500 underline underline-offset-2"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setFilterOpen(false)}
                  aria-label="Close"
                  className="p-1.5 -mr-1.5 rounded-full hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Category</h4>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/shop"
                  onClick={() => setFilterOpen(false)}
                  className={`px-3 py-1.5 rounded-full border text-sm ${
                    cat === "all"
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 text-neutral-600"
                  }`}
                >
                  All
                </Link>
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/shop?category=${c.slug}`}
                    onClick={() => setFilterOpen(false)}
                    className={`capitalize px-3 py-1.5 rounded-full border text-sm ${
                      cat === c.slug
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 text-neutral-600"
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Brands</h4>
              <div className="grid grid-cols-2 gap-2">
                {BRANDS.map((b) => {
                  const on = brands.includes(b);
                  return (
                    <button
                      key={b}
                      onClick={() => toggleBrand(b)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                        on ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 text-neutral-600"
                      }`}
                    >
                      {b}
                      {on && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Price</h4>
              <div className="space-y-1">
                {PRICE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setPrice(o.value)}
                    className="w-full flex items-center justify-between py-3 text-sm text-left"
                  >
                    <span className={price === o.value ? "font-semibold text-neutral-950" : "text-neutral-600"}>
                      {o.label}
                    </span>
                    {price === o.value && <Check className="w-4 h-4 text-neutral-950" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setFilterOpen(false)}
              className="w-full h-11 rounded-xl bg-neutral-950 text-white text-sm font-medium mb-2"
            >
              Show {filtered.length} products
            </button>
          </div>
        </div>
      )}
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
