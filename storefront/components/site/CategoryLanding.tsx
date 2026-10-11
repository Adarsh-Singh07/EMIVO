"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/site/ProductCard";
import CatalogueStrip from "@/components/site/CatalogueStrip";
import BankOfferStrip from "@/components/site/BankOfferStrip";
import CouponStrip from "@/components/site/CouponStrip";
import { mapStoreProduct, type Product, getActiveCoupons, fetchBankOffers, type BankOffer } from "@/lib/products";
import {
  storeApi,
  type StoreCategoryPage,
  type StorePriceBucket,
  type ProductListParams,
} from "@/lib/store-api";
import {
  Loader2,
  ArrowRight,
  Tag,
  Wallet,
  Layers,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";

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

function inr(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

export default function CategoryLanding({ slug, initial }: { slug: string; initial?: StoreCategoryPage | null }) {
  const [page, setPage] = useState<StoreCategoryPage | null>(initial && "category" in initial ? initial : null);
  const [metaLoading, setMetaLoading] = useState(!page);

  // ----- filterable grid state -----
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [gridLoading, setGridLoading] = useState(true);

  const [brand, setBrand] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<SortValue>("relevance");
  const [pageNum, setPageNum] = useState(1);

  const [coupons, setCoupons] = useState<Parameters<typeof CouponStrip>[0]["coupons"]>([]);
  const [offers, setOffers] = useState<BankOffer[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);

  // Load meta (payload) if not provided by the server
  useEffect(() => {
    if (page) return;
    let cancelled = false;
    storeApi
      .getCategoryPage(slug)
      .then((p) => {
        if (!cancelled) setPage(p);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Offers + coupons
  useEffect(() => {
    getActiveCoupons().then((c) => setCoupons((c as any[]) || [])).catch(() => {});
    fetchBankOffers().then((o) => setOffers(o || [])).catch(() => {});
  }, []);

  // ----- grid fetch -----
  useEffect(() => {
    let cancelled = false;
    setGridLoading(true);
    const params: ProductListParams = {
      category: slug,
      sort,
      page: pageNum,
      page_size: PAGE_SIZE,
    };
    if (brand) params.brand = brand;
    if (minPrice != null) params.min_price = minPrice;
    if (maxPrice != null) params.max_price = maxPrice;
    storeApi
      .listProducts(params)
      .then((data) => {
        if (cancelled) return;
        setProducts(data.items.map(mapStoreProduct));
        setTotal(data.total);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setGridLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, sort, brand, minPrice, maxPrice, pageNum]);

  const scrollToGrid = useCallback(() => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const applyBrand = (name: string) => {
    setBrand(name === brand ? "" : name);
    setPageNum(1);
    scrollToGrid();
  };

  const applyBucket = (b: StorePriceBucket) => {
    // toggle off if already active
    if (b.min_price === minPrice && b.max_price === maxPrice) {
      setMinPrice(null);
      setMaxPrice(null);
    } else {
      setMinPrice(b.min_price ?? null);
      setMaxPrice(b.max_price ?? null);
    }
    setPageNum(1);
    scrollToGrid();
  };

  const clearFilters = () => {
    setBrand("");
    setMinPrice(null);
    setMaxPrice(null);
    setSort("relevance");
    setPageNum(1);
  };

  const hasActiveFilters = brand !== "" || minPrice != null || maxPrice != null;

  const cat = page?.category;
  const o = page?.overrides || {};
  const brands = page?.brands || [];
  const buckets = page?.price_buckets || [];
  const children = page?.children || [];
  const featured = useMemo(
    () => (page?.featured || []).map(mapStoreProduct),
    [page?.featured]
  );

  const brandTitle = o.brand_section_title?.trim() || (cat ? `${cat.name} by Brand` : "By Brand");
  const priceTitle = o.price_section_title?.trim() || (cat ? `${cat.name} by Price` : "By Price");

  if (metaLoading && !page) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!page || !cat) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <Package className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
        <h1 className="text-2xl font-semibold text-neutral-900">Category not found</h1>
        <Link href="/shop" className="mt-6 inline-flex h-11 px-6 items-center rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800">
          Back to shop
        </Link>
      </div>
    );
  }

  const heroTitle = o.hero_title?.trim() || cat.name;
  const heroSubtitle = o.hero_subtitle?.trim() || `Shop the best ${cat.name.toLowerCase()} by brand, price and more.`;
  const heroImg = o.hero_image?.trim() || cat.image_url || "";

  return (
    <div className="pb-16">
      {/* ============ HERO ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-3xl overflow-hidden border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white">
          <div className="grid md:grid-cols-2 gap-6 p-6 sm:p-8 lg:p-10 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" /> Category
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-neutral-950">
                {heroTitle}
              </h1>
              <p className="mt-3 text-neutral-500 max-w-md">{heroSubtitle}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={scrollToGrid}
                  className="h-11 px-6 inline-flex items-center gap-2 rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
                >
                  Shop now <ArrowRight className="h-4 w-4" />
                </button>
                {o.hero_link?.trim() ? (
                  <Link
                    href={o.hero_link}
                    className="h-11 px-6 inline-flex items-center rounded-full border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
                  >
                    View all
                  </Link>
                ) : null}
              </div>
            </div>
            {heroImg ? (
              <div className="hidden md:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImg}
                  alt={heroTitle}
                  className="w-full h-56 lg:h-72 object-contain rounded-2xl"
                  loading="eager"
                />
              </div>
            ) : (
              <div className="hidden md:flex h-56 lg:h-72 rounded-2xl bg-neutral-950 items-center justify-center">
                <span className="text-6xl font-black text-white/10 select-none">{cat.name.slice(0, 1)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ BY BRAND ============ */}
      {brands.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-neutral-950" />
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950">{brandTitle}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {brands.map((b) => {
              const active = brand === b.name;
              return (
                <button
                  key={b.name}
                  onClick={() => applyBrand(b.name)}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 min-h-[112px] transition-all ${
                    active
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-lg"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  {b.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      className={`h-10 w-10 rounded-lg object-contain ${active ? "" : "bg-neutral-50"}`}
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className={`h-10 w-10 rounded-lg grid place-items-center text-lg font-bold ${
                        active ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {b.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="text-sm font-medium text-center leading-tight">{b.name}</span>
                  <span className={`text-[11px] ${active ? "text-white/60" : "text-neutral-400"}`}>
                    {b.product_count} items
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ BY PRICE ============ */}
      {buckets.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-neutral-950" />
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950">{priceTitle}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {buckets.map((b, i) => {
              const active = b.min_price === minPrice && b.max_price === maxPrice;
              return (
                <button
                  key={i}
                  onClick={() => applyBucket(b)}
                  className={`rounded-2xl border p-4 text-left transition-all min-h-[84px] flex flex-col justify-center ${
                    active
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-lg"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <span className={`text-base font-semibold ${active ? "text-white" : "text-neutral-950"}`}>
                    {b.label}
                  </span>
                  {typeof b.product_count === "number" && (
                    <span className={`text-xs mt-1 ${active ? "text-white/60" : "text-neutral-400"}`}>
                      {b.product_count} items
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ SUBCATEGORIES ============ */}
      {children.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-neutral-950" />
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950">
              Browse {cat.name} by type
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${encodeURIComponent(c.slug || c.id)}`}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white p-4 min-h-[112px] hover:border-neutral-400 transition-all"
              >
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt={c.name} className="h-10 w-10 rounded-lg object-contain bg-neutral-50" loading="lazy" />
                ) : (
                  <span className="h-10 w-10 rounded-lg grid place-items-center bg-neutral-100 text-neutral-500 text-lg font-bold">
                    {c.name.slice(0, 1)}
                  </span>
                )}
                <span className="text-sm font-medium text-neutral-900 text-center leading-tight">{c.name}</span>
                <span className="text-[11px] text-neutral-400">{c.product_count} items</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ OFFERS ============ */}
      {(coupons.length > 0 || offers.length > 0) && (
        <div className="mt-10 space-y-4">
          {coupons.length > 0 && <CouponStrip coupons={coupons as any} />}
          {offers.length > 0 && <BankOfferStrip offers={offers} />}
        </div>
      )}

      {/* ============ FEATURED ============ */}
      {featured.length > 0 && (
        <CatalogueStrip
          id={slug}
          title={o.hero_title?.trim() ? `Featured in ${o.hero_title.trim()}` : "Featured picks"}
          eyebrow="Handpicked"
          subtitle="Our top recommendations from this category"
          products={featured}
        />
      )}

      {/* ============ FILTERABLE GRID ============ */}
      <div ref={gridRef} className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-10 scroll-mt-20">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950">
              {cat.name} {hasActiveFilters ? "· filtered" : ""}
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              {total} product{total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortValue);
                setPageNum(1);
              }}
              aria-label="Sort products"
              className="h-10 pl-4 pr-9 rounded-xl border border-neutral-200 bg-white text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-neutral-950"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
          </div>
        </div>

        {/* active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {brand && (
              <button
                onClick={() => applyBrand(brand)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-neutral-950 text-white text-xs font-medium"
              >
                Brand: {brand} <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {(minPrice != null || maxPrice != null) && (
              <button
                onClick={() => {
                  setMinPrice(null);
                  setMaxPrice(null);
                  setPageNum(1);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-neutral-950 text-white text-xs font-medium"
              >
                {minPrice != null ? inr(minPrice) : "any"} – {maxPrice != null ? inr(maxPrice) : "∞"}
              </button>
            )}
            <button onClick={clearFilters} className="h-9 px-3 rounded-full border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50">
              Clear
            </button>
          </div>
        )}

        {gridLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-neutral-100 p-3 animate-pulse">
                <div className="aspect-square rounded-xl bg-neutral-100 mb-3" />
                <div className="h-3 bg-neutral-100 rounded w-1/3 mb-2" />
                <div className="h-4 bg-neutral-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-neutral-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {(hasPrev || hasNext) && (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPageNum((n) => Math.max(1, n - 1))}
                  disabled={!hasPrev}
                  className="h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium disabled:opacity-40 hover:border-neutral-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-neutral-500">
                  Page {pageNum}
                </span>
                <button
                  onClick={() => setPageNum((n) => n + 1)}
                  disabled={!hasNext}
                  className="h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium disabled:opacity-40 hover:border-neutral-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="text-center py-16 border border-dashed border-neutral-200 rounded-3xl text-neutral-500">
            <Package className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
            <p>No products match your filters.</p>
            <button
              onClick={clearFilters}
              className="mt-6 h-10 px-6 inline-flex items-center rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
