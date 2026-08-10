"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ChevronRight, LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/components/site/CartProvider";
import { fetchApiProducts, type Product } from "@/lib/products";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function WishlistPage() {
  const { user, loading, refreshUser } = useAuth();
  const { add: addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(false);

  const wishlistIds: string[] = (user?.wishlist || []) as string[];

  useEffect(() => {
    setFetching(true);
    fetchApiProducts({ page_size: 100 })
      .then((data) => {
        setProducts(data);
      })
      .catch((err) => console.error("Failed to fetch products", err))
      .finally(() => setFetching(false));
  }, []);

  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  const handleRemove = async (productId: string) => {
    try {
      const updatedWishlist = wishlistIds.filter((id) => id !== productId);
      await apiClient.put("/users/me", { wishlist: updatedWishlist });
      await refreshUser();
      toast.success("Removed from wishlist");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update wishlist");
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      mrp: product.mrp,
      img: product.img,
    });
    toast.success("Added to cart");
  };

  if (loading || fetching) {
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
          href="/login"
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
        <span className="text-sm font-medium text-neutral-500">{wishlistProducts.length} items</span>
      </div>

      {wishlistProducts.length === 0 ? (
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
          {wishlistProducts.map((p) => (
            <div
              key={p.id}
              className="border border-neutral-200 rounded-3xl overflow-hidden bg-white flex flex-col group relative"
            >
              <button
                onClick={() => handleRemove(p.id)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-red-600 transition-colors"
                title="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <Link href={`/product/${p.id}`} className="aspect-square bg-neutral-50 overflow-hidden relative block">
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </Link>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">{p.brand}</p>
                  <Link href={`/product/${p.id}`} className="font-semibold text-neutral-950 hover:underline block line-clamp-1 mb-2">
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">{inr(p.price)}</span>
                    {p.mrp > p.price && (
                      <span className="text-neutral-400 line-through text-xs">{inr(p.mrp)}</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <button
                    onClick={() => handleAddToCart(p)}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
