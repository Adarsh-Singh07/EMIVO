/**
 * ELEKTRIX product catalog adapter.
 *
 * The live backend (`/store/products`, see docs/API_V02_CONTRACT.md) is the
 * primary source of truth. The static PRODUCTS array below is ONLY an offline
 * fallback used when the API is unreachable (e.g. local dev without the
 * backend running) so the storefront still renders.
 *
 * IMPORTANT: every price in this module is integer PAISE — both for API
 * products and for the static fallback (converted on mapping). Use
 * lib/format.ts `inr()` to render.
 */

import type { StoreProduct, ProductListParams, ProductPage } from "./store-api";

/* ------------------------------------------------------------------ */
/* UI types                                                            */
/* ------------------------------------------------------------------ */

export interface Category {
  slug: string;
  name: string;
  icon: string;
  image_url?: string;
  keywords?: string;
}

export interface ProductSpec {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number; // paise
}

export interface Product {
  status?: string;
  /** Database UUID — used for cart/wishlist/compare API calls. */
  id: string;
  /** slug (preferred) or id — used in /product/[id] URLs. */
  slug: string;
  name: string;
  /** category_slug */
  category: string;
  categoryName?: string;
  brand: string;
  return_policy?: string;
  warranty_info?: string;
  /** Effective selling price in paise (authoritative). */
  price: number;
  /** MRP in paise. */
  mrp: number;
  /** Discount percent (0 when no MRP premium). */
  discount: number;
  rating?: number;
  reviews?: number;
  inStock: boolean;
  stockAvailable?: number | null;
  colors: string[];
  images: string[];
  img: string;
  imgHover: string;
  tagline: string;
  highlights: string[];
  description?: string;
  specs?: ProductSpec[];
  variants?: ProductVariant[];
  sku?: string;
  onOffer?: boolean;
  createdAt?: string;
}

export interface HeroSlide {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  price: number;
  mrp: number;
  cta: string;
  link: string;
  img: string;
  bg: string;
}

export interface PromoTile {
  title: string;
  subtitle: string;
  img: string;
  link: string;
}

/** Canonical href for a product (slug preferred, id fallback). */
export const productHref = (p: Pick<Product, "id" | "slug">): string =>
  `/product/${p.slug || p.id}`;

/* ------------------------------------------------------------------ */
/* Static fallback catalog (offline only)                              */
/* ------------------------------------------------------------------ */

interface StaticProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number; // rupees in the seed data — converted to paise on mapping
  mrp: number;
  discount: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  colors: string[];
  img: string;
  imgHover: string;
  tagline: string;
  highlights: string[];
}

const GH = "https://raw.githubusercontent.com/Adarsh-Singh07/EMIVO/demo/public/images/fynode";

export const CATEGORIES: Category[] = [
  { slug: "mobiles", name: "Mobiles", icon: "Smartphone" },
  { slug: "laptops", name: "Laptops", icon: "Laptop" },
  { slug: "appliances", name: "Appliances", icon: "Tv" },
  { slug: "audio", name: "Audio", icon: "Headphones" },
  { slug: "wearables", name: "Wearables", icon: "Watch" },
  { slug: "accessories", name: "Accessories", icon: "Cable" },
];

export const BRANDS = ["Apple", "Samsung", "Sony", "JBL", "Bose", "LG", "Dell", "HP"];

/** Maps the hex colour codes used in `Product.colors` to human-friendly names. */
const COLOR_NAMES: Record<string, string> = {
  "#1a1a1a": "Black",
  "#222222": "Charcoal",
  "#111111": "Black",
  "#000000": "Black",
  "#ffffff": "White",
  "#e5e5e5": "Silver",
  "#e0e0e0": "Silver",
  "#c9c9c9": "Silver",
  "#c0c0c0": "Silver",
  "#8a8a8a": "Grey",
  "#5c5c5c": "Grey",
  "#e6dcc6": "Beige",
  "#f5deb3": "Gold",
  "#c9a066": "Gold",
  "#d6ceb8": "Champagne",
  "#8a5a2b": "Brown",
  "#e07a2b": "Orange",
  "#ee1111": "Red",
  "#00aaff": "Blue",
  "#0e2148": "Navy",
};

/** Returns a friendly colour name for a hex code, falling back to the raw code. */
export function colorName(hex: string): string {
  return COLOR_NAMES[hex.toLowerCase()] ?? hex;
}

const STATIC_PRODUCTS: StaticProduct[] = [
  {
    id: "iphone-16-pro-256gb",
    name: "iPhone 16 Pro 256GB",
    category: "mobiles",
    brand: "Apple",
    price: 119900,
    mrp: 134900,
    discount: 11,
    rating: 4.7,
    reviews: 328,
    inStock: true,
    colors: ["#1a1a1a", "#e5e5e5", "#f5deb3"],
    img: "https://images.unsplash.com/photo-1716882173326-04d822f142a8?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    imgHover: "https://images.unsplash.com/photo-1656078411660-05f2cf994d33?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    tagline: "Titanium. Apple Intelligence. A18 Pro.",
    highlights: [
      "6.3 in Super Retina XDR display",
      "A18 Pro chip with 6-core GPU",
      "48MP Fusion camera system",
      "Titanium design, USB-C",
    ],
  },
  {
    id: "macbook-air-m3",
    name: 'MacBook Air 13" M3 8GB/256GB',
    category: "laptops",
    brand: "Apple",
    price: 99900,
    mrp: 114900,
    discount: 13,
    rating: 4.8,
    reviews: 512,
    inStock: true,
    colors: ["#1a1a1a", "#c9c9c9", "#d6ceb8"],
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    imgHover: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    tagline: "Supercharged by M3. Silent, fast, all-day battery.",
    highlights: [
      "Apple M3 chip",
      "13.6-inch Liquid Retina display",
      "Up to 18 hours battery",
      "MagSafe charging",
    ],
  },
  {
    id: "smart-tv-55",
    name: 'Ultra HD Smart LED TV 55" 4K',
    category: "appliances",
    brand: "LG",
    price: 42990,
    mrp: 69990,
    discount: 39,
    rating: 4.4,
    reviews: 214,
    inStock: true,
    colors: ["#111111"],
    img: "https://images.unsplash.com/photo-1577979749830-f1d742b96791?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    imgHover: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    tagline: "Cinema at home. Dolby Vision + Atmos.",
    highlights: [
      '55" 4K UHD display',
      "Dolby Vision IQ & Atmos",
      "WebOS smart platform",
      "Voice control (Alexa & Google)",
    ],
  },
  {
    id: "sony-wh1000xm5",
    name: "Sony WH-1000XM5 Wireless Headphones",
    category: "audio",
    brand: "Sony",
    price: 26990,
    mrp: 34990,
    discount: 23,
    rating: 4.8,
    reviews: 421,
    inStock: true,
    colors: ["#111111", "#e6dcc6", "#5c5c5c"],
    img: `${GH}/01-2.jpg`,
    imgHover: `${GH}/02-1.jpg`,
    tagline: "Industry-leading noise cancellation",
    highlights: [
      "30 hr battery with quick charge",
      "8 mic multi-noise sensing",
      "Speak-to-chat & multipoint",
      "Comfort-fit soft ear cushions",
    ],
  },
  {
    id: "anc-rw75",
    name: "Active Noise-Cancelling RW75",
    category: "audio",
    brand: "JBL",
    price: 8519,
    mrp: 10277,
    discount: 14,
    rating: 4.3,
    reviews: 96,
    inStock: true,
    colors: ["#8a5a2b", "#000000", "#e0e0e0"],
    img: `${GH}/01-37.jpg`,
    imgHover: `${GH}/02-32.jpg`,
    tagline: "Crystal-clear audio for work & travel",
    highlights: [
      "Hybrid ANC technology",
      "Crisp bass & clear treble",
      "40h playtime",
      "Foldable travel design",
    ],
  },
  {
    id: "bugatti-studio",
    name: "RW98 Bugatti Studio Headphones",
    category: "audio",
    brand: "Bose",
    price: 12499,
    mrp: 14399,
    discount: 13,
    rating: 4.5,
    reviews: 173,
    inStock: true,
    colors: ["#e07a2b", "#111111"],
    img: `${GH}/01-3.jpg`,
    imgHover: `${GH}/02-2.jpg`,
    tagline: "Studio-grade sound for creators",
    highlights: [
      "Balanced studio tuning",
      "Detachable coiled cable",
      "Memory foam cushions",
      "Zero-latency wired mode",
    ],
  },
  {
    id: "jbl-flip-speaker",
    name: "JBL Flip 6 Portable Bluetooth Speaker",
    category: "audio",
    brand: "JBL",
    price: 8999,
    mrp: 12999,
    discount: 30,
    rating: 4.6,
    reviews: 621,
    inStock: true,
    colors: ["#000000", "#ee1111", "#00aaff"],
    img: `${GH}/04-1.jpg`,
    imgHover: `${GH}/04-7.jpg`,
    tagline: "Bold sound. Bolder color.",
    highlights: [
      "IP67 waterproof & dustproof",
      "12hr playtime",
      "PartyBoost pairing",
      "Racetrack woofer + tweeter",
    ],
  },
  {
    id: "airpods-pro-3",
    name: "Wireless Earbuds Pro 3 ANC",
    category: "audio",
    brand: "Apple",
    price: 21990,
    mrp: 24990,
    discount: 12,
    rating: 4.7,
    reviews: 812,
    inStock: true,
    colors: ["#ffffff", "#111111"],
    img: `${GH}/03-1.jpg`,
    imgHover: `${GH}/03-2.jpg`,
    tagline: "Adaptive audio. Hearing aid ready.",
    highlights: [
      "Active Noise Cancellation",
      "Adaptive Transparency",
      "Spatial audio with head tracking",
      "MagSafe charging case",
    ],
  },
  {
    id: "gaming-headset-x1",
    name: "Gaming Headset X1 RGB 7.1",
    category: "audio",
    brand: "Samsung",
    price: 6499,
    mrp: 9499,
    discount: 32,
    rating: 4.2,
    reviews: 158,
    inStock: true,
    colors: ["#111111", "#ee1111"],
    img: `${GH}/01-28.jpg`,
    imgHover: `${GH}/02-24.jpg`,
    tagline: "Hear every footstep. Win every match.",
    highlights: [
      "7.1 virtual surround",
      "RGB dynamic lighting",
      "Detachable boom mic",
      "Cross-platform compatible",
    ],
  },
  {
    id: "watch-ultra-2",
    name: "Watch Ultra 2 GPS + Cellular 49mm",
    category: "wearables",
    brand: "Apple",
    price: 89900,
    mrp: 99900,
    discount: 10,
    rating: 4.7,
    reviews: 244,
    inStock: true,
    colors: ["#222222", "#c9a066"],
    img: `${GH}/03-26.jpg`,
    imgHover: `${GH}/03-32.jpg`,
    tagline: "Beyond every limit.",
    highlights: [
      "Precision dual-frequency GPS",
      "36 hr battery (72 hr low power)",
      "Titanium case, sapphire crystal",
      "Depth & dive to 40m",
    ],
  },
  {
    id: "studio-mic-pro",
    name: "Studio Condenser Microphone Pro",
    category: "accessories",
    brand: "Bose",
    price: 5999,
    mrp: 8999,
    discount: 33,
    rating: 4.4,
    reviews: 88,
    inStock: true,
    colors: ["#000000"],
    img: `${GH}/01-41.jpg`,
    imgHover: `${GH}/02-36.jpg`,
    tagline: "Studio quality for streaming & podcasts",
    highlights: [
      "24-bit / 96 kHz audio",
      "Cardioid pickup pattern",
      "Zero-latency headphone monitor",
      "USB-C plug & play",
    ],
  },
  {
    id: "dj-headphones",
    name: "DJ MH40 L_UNIFORM Headphones",
    category: "audio",
    brand: "JBL",
    price: 7499,
    mrp: 9899,
    discount: 24,
    rating: 4.0,
    reviews: 62,
    inStock: true,
    colors: ["#8a5a2b", "#f5deb3"],
    img: `${GH}/01-49.jpg`,
    imgHover: `${GH}/02-43.jpg`,
    tagline: "Deep bass. Long sets. All night.",
    highlights: [
      "50mm dynamic drivers",
      "Swiveling ear cups",
      "Detachable cable",
      "Rugged leather build",
    ],
  },
  {
    id: "premium-over-ear",
    name: "Active Noise-Cancelling SW85",
    category: "audio",
    brand: "Bose",
    price: 10785,
    mrp: 21499,
    discount: 50,
    rating: 4.5,
    reviews: 141,
    inStock: true,
    colors: ["#0e2148", "#c0c0c0"],
    img: `${GH}/01-50.jpg`,
    imgHover: `${GH}/02-44.jpg`,
    tagline: "Reference-grade over-ear listening",
    highlights: [
      "Hi-Res Audio certified",
      "Adaptive ANC",
      "40h battery life",
      "Foldable premium build",
    ],
  },
  {
    id: "over-ear-51",
    name: "Over-Ear Comfort Headphones",
    category: "audio",
    brand: "Sony",
    price: 4499,
    mrp: 6499,
    discount: 31,
    rating: 4.1,
    reviews: 79,
    inStock: true,
    colors: ["#111111", "#8a8a8a"],
    img: `${GH}/01-51.jpg`,
    imgHover: `${GH}/02-45.jpg`,
    tagline: "All-day comfort with balanced sound",
    highlights: [
      "Bluetooth 5.3",
      "35h playtime",
      "Foldable design",
      "Built-in mic",
    ],
  },
];

/** Stable pick from the static image pool, used when API images are missing. */
function fallbackImage(seed: string, index: number): string {
  const pool = [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "https://images.unsplash.com/photo-1583394838336-acdf977e91f3?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    `${GH}/01-2.jpg`,
    `${GH}/03-1.jpg`,
    `${GH}/04-1.jpg`,
    `${GH}/03-26.jpg`,
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[(h + index) % pool.length];
}

/* ------------------------------------------------------------------ */
/* Mappers                                                             */
/* ------------------------------------------------------------------ */

/** Map a v0.2 StoreProduct (paise) to the UI Product shape (paise). */
export function mapStoreProduct(p: StoreProduct): Product {
  const images =
    p.images && p.images.length > 0
      ? p.images
      : [fallbackImage(p.id, 0), fallbackImage(p.id, 1)];

  const price = p.effective_price ?? p.price;
  const mrp = p.mrp && p.mrp > price ? p.mrp : price;
  const discount =
    p.discount_percent != null
      ? Math.round(p.discount_percent)
      : mrp > price
        ? Math.round(((mrp - price) / mrp) * 100)
        : 0;

  return {
    id: p.id,
    slug: p.slug || p.id,
    name: p.name,
    category: p.category_slug || "accessories",
    categoryName: p.category_name,
    brand: p.brand || "ELEKTRIX",
    price,
    mrp,
    discount,
    inStock: p.stock ? p.stock.in_stock : true,
    stockAvailable: p.stock ? p.stock.available : null,
    colors: [],
    images,
    img: images[0],
    imgHover: images[1] || images[0],
    tagline: p.description?.split(/[.\n]/)[0]?.slice(0, 90) || p.name,
    highlights: p.tags || [],
    description: p.description,
    specs: p.specs || [],
    variants: (p.variants || []).map((v) => ({ id: v.id, name: v.name, price: v.price })),
    sku: p.sku,
    onOffer: p.on_offer,
    createdAt: p.created_at,
  };
}

/** Map a static seed product (rupees) to the UI Product shape (paise). */
function mapStaticProduct(p: StaticProduct): Product {
  return {
    id: p.id,
    slug: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    price: p.price * 100,
    mrp: p.mrp * 100,
    discount: p.discount,
    rating: p.rating,
    reviews: p.reviews,
    inStock: p.inStock,
    stockAvailable: p.inStock ? 25 : 0,
    colors: p.colors,
    images: [p.img, p.imgHover],
    img: p.img,
    imgHover: p.imgHover,
    tagline: p.tagline,
    highlights: p.highlights,
  };
}

/** The static catalog mapped to the UI shape — OFFLINE FALLBACK ONLY. */
export const PRODUCTS: Product[] = STATIC_PRODUCTS.map(mapStaticProduct);

/* ------------------------------------------------------------------ */
/* Static marketing content                                            */
/* ------------------------------------------------------------------ */

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    eyebrow: "New Arrival",
    title: "iPhone 16 Pro",
    subtitle: "Titanium. Apple Intelligence. A18 Pro chip.",
    price: 119900,
    mrp: 134900,
    cta: "Shop iPhone 16 Pro",
    link: "/product/iphone-16-pro-256gb",
    img: "https://images.unsplash.com/photo-1716882173326-04d822f142a8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    bg: "from-neutral-100 to-neutral-200",
  },
  {
    id: 2,
    eyebrow: "Powered by M3",
    title: "MacBook Air M3",
    subtitle: "Fast. Fanless. Fabulously light.",
    price: 99900,
    mrp: 114900,
    cta: "Discover MacBook Air",
    link: "/product/macbook-air-m3",
    img: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    bg: "from-zinc-100 to-stone-200",
  },
  {
    id: 3,
    eyebrow: "Home Cinema",
    title: "Smart 4K Ultra HD TV",
    subtitle: "Dolby Vision IQ & Atmos. Save 39% today.",
    price: 42990,
    mrp: 69990,
    cta: "Upgrade Your Screen",
    link: "/product/smart-tv-55",
    img: "https://images.unsplash.com/photo-1577979749830-f1d742b96791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    bg: "from-neutral-200 to-neutral-300",
  },
];

export const PROMO_TILES: PromoTile[] = [
  {
    title: "Wireless Earbuds",
    subtitle: "Up to 40% off",
    img: `${GH}/03-1.jpg`,
    link: "/shop?category=audio",
  },
  {
    title: "Smart Watches",
    subtitle: "Starts ₹4,999",
    img: `${GH}/03-26.jpg`,
    link: "/shop?category=wearables",
  },
  {
    title: "Premium Speakers",
    subtitle: "JBL, Bose & more",
    img: `${GH}/04-1.jpg`,
    link: "/shop?category=audio",
  },
];

/* ------------------------------------------------------------------ */
/* Data helpers — live API first, static fallback on failure           */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Server-side fetch of a product page from /store/products with ISR caching.
 * Returns null when the API is unreachable (caller falls back to static).
 */
export async function fetchStoreProductsServer(
  params: ProductListParams = {}
): Promise<ProductPage | null> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.brand) sp.set("brand", params.brand);
  if (params.min_price != null) sp.set("min_price", String(params.min_price));
  if (params.max_price != null) sp.set("max_price", String(params.max_price));
  if (params.featured) sp.set("featured", "true");
  if (params.in_stock) sp.set("in_stock", "true");
  if (params.sort) sp.set("sort", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.page_size) sp.set("page_size", String(params.page_size));
  const qs = sp.toString();

  try {
    const res = await fetch(`${API_BASE}/store/products${qs ? `?${qs}` : ""}`, {
      next: { revalidate: 60 },
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as ProductPage;
  } catch {
    return null;
  }
}

/**
 * Fetch a page of products mapped to the UI shape.
 * Falls back to a synthetic page built from the static catalog when the API
 * is unreachable or returns no items.
 */
export async function fetchApiProducts(
  params: ProductListParams = {}
): Promise<{ products: Product[]; page: ProductPage | null }> {
  const page = await fetchStoreProductsServer({ page_size: 24, ...params });
  if (page && page.items.length > 0) {
    return { products: page.items.map(mapStoreProduct), page };
  }
  return { products: PRODUCTS, page: null };
}

/** Single product by slug or id. Static fallback keeps old links working. */
export async function getApiProductById(idOrSlug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/store/products/${encodeURIComponent(idOrSlug)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as StoreProduct;
      return mapStoreProduct(data);
    }
  } catch {
    /* fall through to static */
  }
  return PRODUCTS.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
}

/** Related products for a slug/id; falls back to a static slice. */
export async function getRelatedProducts(idOrSlug: string, limit = 8): Promise<Product[]> {
  try {
    const res = await fetch(
      `${API_BASE}/store/products/${encodeURIComponent(idOrSlug)}/related?limit=${limit}`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = (await res.json()) as StoreProduct[];
      if (Array.isArray(data) && data.length > 0) return data.map(mapStoreProduct);
    }
  } catch {
    /* fall through to static */
  }
  return PRODUCTS.filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug).slice(0, limit);
}

/** Featured products (API first, static fallback). */
export async function getFeatured(n = 8): Promise<Product[]> {
  const { products } = await fetchApiProducts({ featured: true, page_size: n, sort: "newest" });
  return products.slice(0, n);
}

/** Trending products (API first, static fallback). */
export async function getTrending(n = 4): Promise<Product[]> {
  const { products } = await fetchApiProducts({
    category: "audio",
    page_size: n,
    sort: "discount",
  });
  return products.slice(0, n);
}

/** Newest arrivals (API first, static fallback). */
export async function getNewArrivals(n = 8): Promise<Product[]> {
  const { products } = await fetchApiProducts({ page_size: n, sort: "newest" });
  return products.slice(0, n);
}

/** Category list for navigation (API first, static fallback). */
export async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/store/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return CATEGORIES;
    const data = (await res.json()) as Array<{ slug: string; name: string }>;
    if (!Array.isArray(data) || data.length === 0) return CATEGORIES;
    return data
      .filter((c) => c && c.slug && c.name)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        icon: CATEGORIES.find((s) => s.slug === c.slug)?.icon || "Package",
      }));
  } catch {
    return CATEGORIES;
  }
}

export async function fetchStoreConfigServer(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/store/config`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


export async function getActiveCoupons(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/store/coupons`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
