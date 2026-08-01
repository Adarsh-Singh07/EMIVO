"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid3X3,
  LayoutList,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { getAllProducts } from "@/lib/emivo-data";
import { LedgerFigure } from "@/components/ui/ledger-figure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/product";

type SortOption = "relevance" | "price-asc" | "price-desc" | "rating" | "newest";
type ViewMode = "grid" | "list";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);

  const allProducts = getAllProducts();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput)}`);
    } else {
      router.push(`/search`);
    }
  };

  const results = useMemo(() => {
    if (!query.trim()) return allProducts;

    const searchTerms = query.toLowerCase().split(/\s+/);

    return allProducts.filter((product) => {
      const searchText = `${product.brand} ${product.title} ${product.category} ${product.tagline}`.toLowerCase();
      return searchTerms.every((term) => searchText.includes(term));
    });
  }, [query, allProducts]);

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortBy) {
      case "price-asc":
        return sorted.sort((a, b) => a.basePrice - b.basePrice);
      case "price-desc":
        return sorted.sort((a, b) => b.basePrice - a.basePrice);
      case "rating":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "newest":
        return sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      default:
        return sorted;
    }
  }, [results, sortBy]);

  return (
    <>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container-emivo py-8 md:py-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-secondary)]">
                <Search className="h-4 w-4" />
                Search
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] md:text-5xl">
                {query ? `Results for "${query}"` : "All products"}
              </h1>
              <p className="mt-2 text-sm text-[var(--color-secondary)]">
                {sortedResults.length} product{sortedResults.length === 1 ? "" : "s"} found
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                className="h-12 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-background)] pl-11 pr-4 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-secondary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 shadow-sm"
              />
            </form>
          </div>
        </div>
      </div>

      <div className="sticky top-[72px] z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-lg">
        <div className="container-emivo flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              className="shrink-0 rounded-full"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>

            <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
              {(["relevance", "price-asc", "price-desc", "newest"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    sortBy === option
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  {option === "relevance" && "Relevance"}
                  {option === "price-asc" && "Price ↑"}
                  {option === "price-desc" && "Price ↓"}
                  {option === "newest" && "Newest"}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-full p-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-full p-2 transition-colors ${
                  viewMode === "list"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
                }`}
                aria-label="List view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="container-emivo py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="mr-1 font-semibold text-[var(--color-secondary)]">Active:</span>
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1.5 font-medium">
                    In Stock <X className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-[var(--color-primary)]" onClick={() => setShowFilters(false)}>
                    Clear all
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="container-emivo py-8 md:py-12">
        {sortedResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 grid h-24 w-24 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-inner">
              <ShoppingBag className="h-10 w-10 text-[var(--color-secondary)]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">No products found</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-secondary)]">
              We couldn't find any products matching &quot;{query}&quot;. Try checking your spelling or using more general terms.
            </p>
            <Button asChild variant="outline" size="lg" className="mt-6 rounded-full font-bold">
              <Link href="/search">Reset search</Link>
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {sortedResults.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedResults.map((product, index) => (
              <ProductListItem key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)] shadow-lg" />
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </main>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Link
        href={`/product/${product.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-xl)]"
      >
        <div className="relative aspect-square shrink-0 bg-[var(--color-background)] p-6">
          {product.isNew && (
            <Badge variant="emi" className="absolute left-4 top-4 z-10">
              New
            </Badge>
          )}
          <Image
            src={product.gallery[0]?.url || "/placeholder.png"}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain p-4 transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        <div className="flex flex-1 flex-col p-4 md:p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
            {product.brand}
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-[var(--color-foreground)] md:text-base">
            {product.title}
          </h3>

          <div className="mt-auto pt-4">
            <div className="flex items-baseline gap-2">
              <LedgerFigure paisa={product.basePrice} size="sm" />
              {product.mrp > product.basePrice && (
                <span className="text-xs text-[var(--color-secondary)] line-through">
                  ₹{(product.mrp / 100).toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {product.baseEMI && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--color-accent)]">
                <Sparkles className="h-3 w-3" />
                EMI from <LedgerFigure paisa={product.baseEMI} size="xs" tone="accent" noLine suffix="/mo" />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ProductListItem({ product, index }: { product: Product; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/product/${product.id}`}
        className="group flex gap-4 overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-all hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-xl)] md:gap-8 md:p-6"
      >
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] md:h-40 md:w-40">
          <Image
            src={product.gallery[0]?.url || "/placeholder.png"}
            alt={product.title}
            fill
            sizes="160px"
            className="object-contain p-4 transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
                  {product.brand}
                </span>
                {product.isNew && (
                  <Badge variant="emi" className="text-[9px]">
                    New
                  </Badge>
                )}
              </div>
              <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-[var(--color-foreground)] md:text-xl">
                {product.title}
              </h3>
              {product.tagline && (
                <p className="mt-1.5 hidden line-clamp-2 text-sm leading-6 text-[var(--color-secondary)] md:block">
                  {product.tagline}
                </p>
              )}
            </div>

            <div className="mt-2 text-left md:mt-0 md:text-right">
              <LedgerFigure paisa={product.basePrice} size="lg" />
              {product.mrp > product.basePrice && (
                <div className="mt-1 text-xs text-[var(--color-secondary)] line-through">
                  ₹{(product.mrp / 100).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 pt-2 md:mt-auto">
            {product.rating && (
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-xs font-bold text-[var(--color-foreground)]">
                <span className="text-[var(--color-accent)]">★</span>
                {product.rating.toFixed(1)}
                {product.reviewsCount && (
                  <span className="text-[var(--color-secondary)]">
                    ({product.reviewsCount.toLocaleString("en-IN")})
                  </span>
                )}
              </div>
            )}

            {product.baseEMI && (
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2.5 py-1 text-xs font-bold text-[var(--color-accent)]">
                <Sparkles className="h-3.5 w-3.5" />
                EMI from <LedgerFigure paisa={product.baseEMI} size="xs" tone="accent" noLine suffix="/mo" />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

