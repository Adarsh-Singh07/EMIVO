"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  StarHalf,
  ShoppingBag,
  Zap,
  Heart,
  RefreshCw,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  Check,
  ChevronRight,
} from "lucide-react";
import ProductCard from "@/components/site/ProductCard";
import { useCart } from "@/components/site/CartProvider";
import { getProduct, getTrending } from "@/lib/products";
import { toast } from "sonner";

const inr = (n: number) => `â‚¹${n.toLocaleString("en-IN")}`;

const TABS = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specifications" },
  { id: "reviews", label: "Reviews" },
];

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: full }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
      ))}
      {half && <StarHalf className="w-4 h-4 fill-amber-400 text-amber-400" />}
    </span>
  );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = getProduct(id);
  const { add, setDrawerOpen } = useCart();

  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("description");

  // Reset per-product state on client-side navigation between products.
  useEffect(() => {
    setActiveImg(0);
    setColor(0);
    setQty(1);
    setTab("description");
  }, [id]);

  if (!product) notFound();

  const images = [product.img, product.imgHover];
  const related = getTrending().filter((p) => p.id !== product.id).slice(0, 4);

  const addToCart = () => {
    add(product, qty);
    toast.success("Added to cart");
  };

  const buyNow = () => {
    add(product, qty);
    setDrawerOpen(false);
    toast.success("Added to cart");
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link href="/">Home</Link> <ChevronRight className="inline w-3 h-3" />{" "}
        <Link href="/shop" className="hover:text-neutral-900">Shop</Link>{" "}
        <ChevronRight className="inline w-3 h-3" />{" "}
        <Link href={`/shop?category=${product.category}`} className="capitalize hover:text-neutral-900">
          {product.category}
        </Link>{" "}
        <ChevronRight className="inline w-3 h-3" />{" "}
        <span className="text-neutral-900">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="flex flex-col-reverse sm:flex-row gap-4">
          <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 hide-scrollbar snap-x snap-mandatory">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 snap-center transition-all ${
                  activeImg === i ? "border-neutral-950" : "border-transparent opacity-70 hover:opacity-100"
                }`}
                aria-label={`View image ${i + 1}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative flex-1 aspect-square rounded-3xl overflow-hidden bg-neutral-50">
            <img
              src={images[activeImg]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.discount > 0 && (
              <span className="absolute top-4 left-4 bg-neutral-950 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                {product.discount}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{product.brand}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">{product.name}</h1>

          <div className="flex items-center gap-3 mt-3">
            <Stars rating={product.rating} />
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-sm text-neutral-400">({product.reviews} reviews)</span>
          </div>

          <p className="text-neutral-600 mt-3">{product.tagline}</p>

          <div className="flex items-end gap-3 mt-5">
            <span className="text-3xl font-semibold">{inr(product.price)}</span>
            {product.mrp > product.price && (
              <span className="text-neutral-400 line-through text-lg">{inr(product.mrp)}</span>
            )}
            {product.discount > 0 && (
              <span className="text-green-600 text-sm font-medium mb-1">
                {Math.round((1 - product.price / product.mrp) * 100)}% off
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-1">Inclusive of all taxes</p>

          {/* Color picker */}
          {product.colors.length > 1 && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Colour: <span className="font-normal text-neutral-500">{product.colors[color]}</span></p>
              <div className="flex gap-2">
                {product.colors.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => setColor(i)}
                    className={`w-9 h-9 rounded-full border-2 grid place-items-center transition-all ${
                      color === i ? "border-neutral-950 scale-105" : "border-neutral-200"
                    }`}
                    style={{ background: c }}
                    aria-label={`Select colour ${c}`}
                    title={c}
                  >
                    {color === i && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + CTAs */}
          <div className="flex items-center gap-3 mt-7">
            <div className="inline-flex items-center border border-neutral-200 rounded-full">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-neutral-100 rounded-l-full"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-medium">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="p-3 hover:bg-neutral-100 rounded-r-full"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {!product.inStock && (
              <span className="text-sm font-medium text-red-600">Out of stock</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              onClick={addToCart}
              disabled={!product.inStock}
              className="flex-1 h-12 inline-flex items-center justify-center gap-2 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" /> Add to Cart
            </button>
            {product.inStock ? (
              <Link
                href="/checkout"
                onClick={buyNow}
                className="flex-1 h-12 inline-flex items-center justify-center gap-2 bg-white text-neutral-950 border border-neutral-950 rounded-full text-sm font-medium hover:bg-neutral-50"
              >
                <Zap className="w-4 h-4" /> Buy Now
              </Link>
            ) : (
              <span className="flex-1 h-12 inline-flex items-center justify-center gap-2 bg-neutral-100 text-neutral-400 border border-neutral-200 rounded-full text-sm font-medium cursor-not-allowed">
                <Zap className="w-4 h-4" /> Buy Now
              </span>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button className="flex-1 h-11 inline-flex items-center justify-center gap-2 border border-neutral-200 rounded-full text-sm hover:bg-neutral-50">
              <Heart className="w-4 h-4" /> Wishlist
            </button>
            <button className="flex-1 h-11 inline-flex items-center justify-center gap-2 border border-neutral-200 rounded-full text-sm hover:bg-neutral-50">
              <RefreshCw className="w-4 h-4" /> Compare
            </button>
            <button
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 border border-neutral-200 rounded-full text-sm hover:bg-neutral-50"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success("Link copied to clipboard");
              }}
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Truck className="w-5 h-5 text-neutral-400 shrink-0" /> Free delivery over â‚¹999
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <ShieldCheck className="w-5 h-5 text-neutral-400 shrink-0" /> Brand warranty
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <RotateCcw className="w-5 h-5 text-neutral-400 shrink-0" /> 10-day returns
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16">
        <div className="flex gap-6 border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium -mb-px border-b-2 transition-colors ${
                tab === t.id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="py-8 max-w-3xl">
          {tab === "description" && (
            <div className="space-y-4 text-neutral-600">
              <p>{product.tagline}</p>
              <ul className="space-y-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "specs" && (
            <div className="border border-neutral-200 rounded-2xl overflow-hidden text-sm">
              {[
                ["Brand", product.brand],
                ["Category", product.category],
                ["Colour", product.colors.map((c) => c).join(", ")],
                ["In Stock", product.inStock ? "Yes" : "No"],
                ["Model", product.id],
              ].map(([k, v], i) => (
                <div key={k} className={`flex justify-between px-4 py-3 ${i % 2 ? "bg-neutral-50" : ""}`}>
                  <span className="text-neutral-500">{k}</span>
                  <span className="font-medium text-neutral-900">{v}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-semibold">{product.rating}</span>
                <div>
                  <Stars rating={product.rating} />
                  <p className="text-sm text-neutral-500 mt-1">{product.reviews} verified reviews</p>
                </div>
              </div>
              <p className="text-sm text-neutral-500">
                Ratings are based on verified purchases from the EMIVO catalog.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      <section className="mt-10">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">You may also like</h2>
          <Link href="/shop" className="text-sm font-medium hover:text-neutral-500">
            View all â†’
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
