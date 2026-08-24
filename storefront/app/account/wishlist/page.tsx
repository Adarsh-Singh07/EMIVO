"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Trash2, ChevronRight, LogIn, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/components/site/CartProvider";
import { storeApi, type WishlistItem } from "@/lib/store-api";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { productHref } from "@/lib/products";

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const wishlist = useWishlist();
  const { add } = useCart();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setFetching(true);
    try {
      const data = await storeApi.getWishlist();
      setItems(data.items || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load wishlist");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) load();
    else setFetching(false);
  }, [user]);

  const handleRemove = async (item: WishlistItem) => {
    setBusyId(item.id);
    try {
      await wishlist.remove(item.product_id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove item");
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    const p = item.product;
    if (p.stock && !p.stock.in_stock) {
      toast.error("This product is out of stock");
      return;
    }
    setBusyId(item.id);
    try {
      const ok = await add({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: p.effective_price,
        mrp: p.mrp,
        img: p.images?.[0],
      });
      if (!ok) return; // add() already surfaced the error
      await storeApi.removeFromWishlist(p.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      await wishlist.refresh();
      toast.success("Moved to cart");
    } finally {
      setBusyId(null);
    }
  };

  if (loading || (user && fetching)) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-6 bg-neutral-100 rounded w-1/4 mx-auto mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-neutral-100 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-16 h-16 text-neutral-400 mx-auto mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Authentication Required</h1>
        <p className="text-neutral-500 mb-6">Please log in to manage your wishlist.</p>
        <Link
          href="/login?next=/account/wishlist"
          className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
        >
          <LogIn className="w-4 h-4" /> Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
        <Link href="/account" className="hover:text-neutral-900">
          My Account
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>Wishlist</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">My Wishlist</h1>
        <span className="text-sm font-medium text-neutral-500">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-neutral-200 rounded-3xl p-16 text-center text-neutral-400">
          <Heart className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <p className="text-sm">Your wishlist is currently empty.</p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 h-10 px-6 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item) => {
            const p = item.product;
            const price = p.effective_price ?? p.price;
            const outOfStock = p.stock ? !p.stock.in_stock : false;
            const lowStock = p.stock?.in_stock && p.stock.available > 0 && p.stock.available <= 5;
            return (
              <div
                key={item.id}
                className="border border-neutral-200 rounded-3xl overflow-hidden bg-white flex flex-col group relative"
              >
                <button
                  onClick={() => handleRemove(item)}
                  disabled={busyId === item.id}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-red-600 transition-colors"
                  title="Remove from wishlist"
                  aria-label={`Remove ${p.name} from wishlist`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link
                  href={productHref({ id: p.id, slug: p.slug })}
                  className="relative aspect-square bg-neutral-100 overflow-hidden block"
                >
                  {p.images && p.images[0] ? (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-xs text-neutral-400 px-4 text-center">
                      {p.name}
                    </span>
                  )}
                </Link>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">
                      {p.brand || "ELEKTRIX"}
                    </p>
                    <Link
                      href={productHref({ id: p.id, slug: p.slug })}
                      className="font-semibold text-neutral-950 hover:underline block line-clamp-1 mb-2"
                    >
                      {p.name}
                    </Link>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold">{inr(price)}</span>
                      {p.mrp && p.mrp > price && (
                        <span className="text-neutral-400 line-through text-xs">{inr(p.mrp)}</span>
                      )}
                    </div>
                    {outOfStock && (
                      <p className="text-xs text-red-600 font-medium mt-1">Out of stock</p>
                    )}
                    {lowStock && (
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        Only {p.stock?.available} left
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                    <button
                      onClick={() => handleMoveToCart(item)}
                      disabled={busyId === item.id || outOfStock}
                      className="w-full h-10 inline-flex items-center justify-center gap-2 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShoppingBag className="w-3.5 h-3.5" />
                      )}
                      {outOfStock ? "Out of Stock" : "Move to Cart"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
