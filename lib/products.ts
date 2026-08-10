/**
 * ELEKTRIX product catalog.
 * Static PRODUCTS array serves as the seed fallback catalog.
 * The async API adapter functions below fetch live data from the backend;
 * when the backend has products seeded they take priority.
 */

export interface Category {
  slug: string;
  name: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
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

export const PRODUCTS: Product[] = [
  {
    id: "iphone-16-pro",
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

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getFeatured(n = 8): Product[] {
  return PRODUCTS.slice(3, 3 + n);
}

export function getTrending(): Product[] {
  return [PRODUCTS[3], PRODUCTS[6], PRODUCTS[7], PRODUCTS[9]];
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    eyebrow: "New Arrival",
    title: "iPhone 16 Pro",
    subtitle: "Titanium. Apple Intelligence. A18 Pro chip.",
    price: 119900,
    mrp: 134900,
    cta: "Shop iPhone 16 Pro",
    link: "/product/iphone-16-pro",
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
/* API shape (from FastAPI backend)                                     */
/* ------------------------------------------------------------------ */

interface ApiProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  base_price: number; // integer minor units (paise)
  compare_at_price?: number;
  category?: string;
  brand?: string;
  status?: string;
  images?: Array<{ url: string; position: number }>;
  variants?: Array<{
    id: string;
    sku: string;
    price: number;
    attributes?: Record<string, string>;
  }>;
  tags?: string[];
  rating?: number;
  review_count?: number;
}

/** Map a backend API product to the storefront Product shape. */
function mapApiProduct(p: ApiProduct): Product {
  const imgs = p.images?.sort((a, b) => a.position - b.position) ?? [];
  const imgUrl = imgs[0]?.url ?? "";
  const imgHoverUrl = imgs[1]?.url ?? imgUrl;

  const pricePaise = p.variants?.[0]?.price ?? p.base_price;
  const priceRupees = Math.round(pricePaise / 100);
  const compareRupees = p.compare_at_price ? Math.round(p.compare_at_price / 100) : Math.round(priceRupees * 1.1);
  const discountPct = compareRupees > priceRupees
    ? Math.round(((compareRupees - priceRupees) / compareRupees) * 100)
    : 0;

  return {
    id: p.slug || p.id,
    name: p.name,
    category: p.category?.toLowerCase() ?? "accessories",
    brand: p.brand ?? "ELEKTRIX",
    price: priceRupees,
    mrp: compareRupees,
    discount: discountPct,
    rating: p.rating ?? 4.5,
    reviews: p.review_count ?? 0,
    inStock: p.status === "active" || p.status == null,
    colors: [],
    img: imgUrl || `https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900`,
    imgHover: imgHoverUrl || `https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900`,
    tagline: p.description?.slice(0, 80) ?? p.name,
    highlights: p.tags ?? [],
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Fetch products from the real backend.
 * Falls back to the static PRODUCTS array if the API is unavailable or returns empty.
 */
export async function fetchApiProducts(params?: {
  category?: string;
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<Product[]> {
  try {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.q) sp.set("search", params.q);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("page_size", String(params?.page_size ?? 50));

    const res = await fetch(`${API_BASE}/products/?${sp}`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60s
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    const items: ApiProduct[] = data.items ?? data ?? [];

    if (items.length === 0) return PRODUCTS;
    return items.map(mapApiProduct);
  } catch {
    // Graceful degradation: use static catalog
    return PRODUCTS;
  }
}

/**
 * Fetch a single product by slug or id.
 * Falls back to static PRODUCTS.find if not found in API.
 */
export async function getApiProductById(id: string): Promise<Product | null> {
  // First, try static catalog for fast lookup
  const staticProduct = PRODUCTS.find((p) => p.id === id);

  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      next: { revalidate: 60 },
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return staticProduct ?? null;
    const data: ApiProduct = await res.json();
    return mapApiProduct(data);
  } catch {
    return staticProduct ?? null;
  }
}
