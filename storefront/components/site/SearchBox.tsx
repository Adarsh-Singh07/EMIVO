"use client";

/**
 * Header search with debounced (300ms) live suggestions from
 * GET /store/products/search. Used by the desktop header bar and the
 * mobile search sheet.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { storeApi, type SearchSuggestion } from "@/lib/store-api";
import { inr } from "@/lib/format";

export default function SearchBox({
  autoFocus = false,
  onNavigate,
  placeholder = "Search for Mobiles, Laptops, Audio & more",
  className = "",
}: {
  autoFocus?: boolean;
  onNavigate?: () => void;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounced suggestions (300ms).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      storeApi
        .searchProducts(q)
        .then((items) => {
          setSuggestions(Array.isArray(items) ? items.slice(0, 6) : []);
          setOpen(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={rootRef} className={`relative flex-1 min-w-0 ${className}`}>
      <form onSubmit={submit} className="flex items-stretch w-full">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          aria-label="Search products"
          autoFocus={autoFocus}
          className="flex-1 min-w-0 h-11 rounded-l-full border border-neutral-300 border-r-0 px-5 text-sm outline-none focus:border-neutral-950 placeholder:text-neutral-400"
        />
        <button
          type="submit"
          aria-label="Search"
          className="h-11 px-5 rounded-r-full bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800 flex items-center gap-2 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="hidden xl:inline">Search</span>
        </button>
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          {loading && suggestions.length === 0 && (
            <div className="p-4 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100" />
                  <div className="flex-1 h-4 bg-neutral-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <p className="p-4 text-sm text-neutral-500">
              No matches for &quot;{query.trim()}&quot;.
            </p>
          )}

          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/product/${s.slug || s.id}`}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 border-b border-neutral-50 last:border-b-0"
            >
              <span className="relative w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                {s.image ? (
                  <Image src={s.image} alt={s.name} fill sizes="40px" className="object-contain" />
                ) : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{s.name}</span>
                {s.brand && <span className="block text-xs text-neutral-400">{s.brand}</span>}
              </span>
              <span className="text-sm font-semibold shrink-0">{inr(s.effective_price)}</span>
            </Link>
          ))}

          {suggestions.length > 0 && (
            <Link
              href={`/shop?q=${encodeURIComponent(query.trim())}`}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="block px-4 py-3 text-sm font-semibold text-center bg-neutral-50 hover:bg-neutral-100"
            >
              View all results for &quot;{query.trim()}&quot; →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
