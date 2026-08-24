import Link from "next/link";
import {
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Watch,
  Cable,
  Package,
  ArrowRight,
  Truck,
  BadgePercent,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import HeroSlider from "@/components/site/HeroSlider";
import ProductCard from "@/components/site/ProductCard";
import NewsletterForm from "@/components/site/NewsletterForm";
import RecentlyViewedStrip from "@/components/site/RecentlyViewedStrip";
import {
  CATEGORIES,
  BRANDS,
  getCategories,
  getNewArrivals,
  getTrending,
  PROMO_TILES,
} from "@/lib/products";

const CAT_ICONS: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Watch,
  Cable,
  Package,
};

const FEATURES = [
  { icon: Truck, title: "Free Delivery", desc: "On all orders over ₹999" },
  { icon: BadgePercent, title: "No-Cost EMI", desc: "Available on 3, 6 & 12 months" },
  { icon: ShieldCheck, title: "100% Genuine", desc: "Brand warranty on everything" },
  { icon: RotateCcw, title: "Easy Returns", desc: "10-day no-questions returns" },
];

// ISR: the marketing frame is static; product sections revalidate frequently.
export const revalidate = 300;

export default async function Home() {
  const [categories, newArrivals, trending] = await Promise.all([
    getCategories(),
    getNewArrivals(8),
    getTrending(4),
  ]);

  return (
    <div>
      {/* 1. Hero slider with auto-rotation */}
      <HeroSlider />

      {/* 2. Features strip — horizontal scroll on mobile, grid on desktop */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white px-4 py-3 min-w-[220px] sm:min-w-[240px] lg:min-w-0 shrink-0 lg:shrink"
            >
              <div className="w-9 h-9 rounded-full bg-neutral-950 text-white grid place-items-center shrink-0">
                <f.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{f.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Shop by Category */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Shop by Category</h2>
            <p className="text-neutral-500 mt-2">Explore our curated collections</p>
          </div>
          <Link
            href="/shop"
            className="hidden md:inline-flex items-center gap-2 text-sm font-medium hover:text-neutral-500"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 -mx-4 px-4 snap-x snap-mandatory">
          {categories.map((cat) => {
            const Icon = CAT_ICONS[cat.icon] || Package;
            return (
              <Link
                key={cat.slug}
                href={`/shop?category=${cat.slug}`}
                className="group flex-shrink-0 w-[90px] md:w-[150px] flex flex-col items-center gap-2 md:gap-3 rounded-2xl border border-neutral-200 p-3 md:p-5 hover:border-neutral-950 hover:shadow-sm transition-all snap-start"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-100 group-hover:bg-neutral-950 group-hover:text-white grid place-items-center transition-colors">
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-[11px] md:text-sm font-medium text-center">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Promo tiles */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {PROMO_TILES.map((tile) => (
            <Link
              key={tile.title}
              href={tile.link}
              className="group relative h-56 md:h-64 rounded-2xl overflow-hidden block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.img}
                alt={tile.title}
                className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-xl font-semibold text-white">{tile.title}</h3>
                <p className="text-white/80 text-sm mt-1">{tile.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Brand marquee */}
      <section className="py-12 border-y border-neutral-100 overflow-hidden">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-16 pr-16">
              {BRANDS.map((brand) => (
                <span
                  key={`${copy}-${brand}`}
                  className="text-2xl font-semibold text-neutral-300 whitespace-nowrap"
                >
                  {brand}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 6. New Arrivals (live catalog, static fallback) */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Just Dropped</p>
            <h2 className="text-3xl font-semibold tracking-tight">New Arrivals</h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="hidden md:inline-flex items-center gap-2 text-sm font-medium hover:text-neutral-500"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 7. Trending in Audio */}
      <section className="bg-neutral-50 border-y border-neutral-100 py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">
                Hot Right Now
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">Trending in Audio</h2>
            </div>
            <Link
              href="/shop?category=audio"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium hover:text-neutral-500"
            >
              View Collection <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Recently viewed (client, localStorage) */}
      <RecentlyViewedStrip />

      {/* 9. Newsletter CTA */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl bg-neutral-950 px-8 py-14 text-center">
          <h2 className="text-3xl font-semibold text-white tracking-tight">Stay in the loop</h2>
          <p className="text-neutral-400 mt-3 max-w-md mx-auto">
            Be first to know about drops, deals and restocks.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
