"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/site/ProductCard";
import { PRODUCTS, CATEGORIES, BRANDS } from "@/lib/products";

const PRICE_OPTIONS = [
  { label: "All Prices", value: "all" },
  { label: "Under ₹10,000", value: "under-10k" },
  { label: "₹10,000 – ₹25,000", value: "10-25k" },
  { label: "₹25,000 – ₹50,000", value: "25-50k" },
  { label: "Above ₹50,000", value: "over-50k" },
];

function ShopContent() {
  const sp = useSearchParams();
  const cat = sp.get("category") ?? "all";
  const query = (sp.get("q") ?? "").trim().toLowerCase();

  const [brands, setBrands] = useState<string[]>([]);
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("featured");

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
        {/* Sidebar filters */}
        <aside className="space-y-8">
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
          <div className="flex items-center justify-between mb-6">
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
