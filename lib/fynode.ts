/**
 * Fynode-style design data for the EMIVO homepage.
 * Mirrors the structure & copy of the klbtheme.com/fynode demo so the
 * rebuilt homepage matches that design 1:1 (demo images downloaded locally).
 */

export const FYNODE_CURRENCY = "$";

/* ------------------------------------------------------------------ */
/* Announcement bar                                                    */
/* ------------------------------------------------------------------ */

export const ANNOUNCEMENT_MESSAGES = [
  "Enjoy free shipping on all orders this week!",
  "Celebrate our anniversary with exclusive deals!",
];

export const LANGUAGES = ["English", "Spanish", "French", "German"];
export const CURRENCIES = ["USD", "EUR"];

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export const NAV_MENU = [
  { label: "Home", href: "/" },
  {
    label: "Shop",
    href: "/products",
    children: [
      { label: "Mobiles", href: "/category/smartphones" },
      { label: "Laptops", href: "/category/laptops" },
      { label: "Audio", href: "/category/audio" },
      { label: "Wearables", href: "/category/wearables" },
      { label: "TV & Appliances", href: "/category/tv" },
    ],
  },
  { label: "Earphones", href: "/category/earphones" },
  { label: "Headphones", href: "/category/headphones" },
  { label: "Microphones", href: "/category/microphones" },
  { label: "Smartwatches", href: "/category/smartwatches" },
  { label: "Speakers", href: "/category/speakers" },
  { label: "Deals", href: "/products", highlight: true },
];

/* ------------------------------------------------------------------ */
/* Hero slider                                                         */
/* ------------------------------------------------------------------ */

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  cta: { label: string; href: string };
  badge: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "perf-design",
    eyebrow: "Highest Quality",
    title: "High Performance and Elegant Design",
    description:
      "Sleek designs, cutting-edge tech, unmatched performance for modern living.",
    image: "/images/fynode/slider-03.jpg",
    cta: { label: "View Headphones", href: "/category/headphones" },
    badge: "New Season",
  },
  {
    id: "confidence",
    eyebrow: "Superior Craftsmanship",
    title: "Technology That Inspires Confidence",
    description:
      "Experience innovation, style, and performance in every electronic product.",
    image: "/images/fynode/slider-02-1.jpg",
    cta: { label: "View Headphones", href: "/category/headphones" },
    badge: "Best Sellers",
  },
  {
    id: "power-style",
    eyebrow: "Highest Quality",
    title: "Experience Power, Discover Style",
    description:
      "Technology redefined: sleek, powerful, reliable, designed for your lifestyle.",
    image: "/images/fynode/slider-03-1.jpg",
    cta: { label: "Shop Now", href: "/products" },
    badge: "Hot Deals",
  },
];

/* ------------------------------------------------------------------ */
/* Brand marquee                                                       */
/* ------------------------------------------------------------------ */

export const BRAND_LOGOS = [
  "/images/fynode/logo-01.png",
  "/images/fynode/logo-02.png",
  "/images/fynode/logo-03.png",
  "/images/fynode/logo-04.png",
  "/images/fynode/logo-05.png",
  "/images/fynode/logo-06.png",
  "/images/fynode/logo-08.png",
  "/images/fynode/logo-01.png",
  "/images/fynode/logo-02.png",
  "/images/fynode/logo-03.png",
  "/images/fynode/logo-04.png",
  "/images/fynode/logo-05.png",
  "/images/fynode/logo-06.png",
  "/images/fynode/logo-08.png",
];

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export interface FynodeCategory {
  name: string;
  count: number;
  image: string;
  href: string;
}

export const CATEGORIES: FynodeCategory[] = [
  {
    name: "Earphones",
    count: 10,
    image: "/images/fynode/category-earphones.png",
    href: "/category/earphones",
  },
  {
    name: "Headphones",
    count: 8,
    image: "/images/fynode/category-headphones.png",
    href: "/category/headphones",
  },
  {
    name: "Microphones",
    count: 8,
    image: "/images/fynode/category-microphone.png",
    href: "/category/microphones",
  },
  {
    name: "Smartwatches",
    count: 7,
    image: "/images/fynode/smartwatch.svg",
    href: "/category/smartwatches",
  },
  {
    name: "Speakers",
    count: 11,
    image: "/images/fynode/category-speakers.png",
    href: "/category/speakers",
  },
];

/* ------------------------------------------------------------------ */
/* Feature banners (3-tile row)                                        */
/* ------------------------------------------------------------------ */

export interface FeatureBanner {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: { label: string; href: string };
}

export const FEATURE_BANNERS: FeatureBanner[] = [
  {
    title: "Unrivaled Precision",
    subtitle: "Where Innovation Meets Immersive Sound",
    description: "Power meets precision in every detail.",
    image: "/images/fynode/banner-01.jpg",
    cta: { label: "Shop Now", href: "/category/headphones" },
  },
  {
    title: "Premium Standards",
    subtitle: "Elevate Your Audio Experience",
    description: "Elevate your life with electronics designed for style and performance.",
    image: "/images/fynode/banner-02.jpg",
    cta: { label: "View Products", href: "/products" },
  },
  {
    title: "Peak Perfection",
    subtitle: "Smart Solutions, Sleek Designs",
    description: "Smart solutions for a connected world.",
    image: "/images/fynode/banner-03.jpg",
    cta: { label: "Shop Now", href: "/category/speakers" },
  },
];

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export interface FynodeProduct {
  id: string;
  title: string;
  brand: string;
  price?: number;
  originalPrice?: number;
  salePercent?: number;
  rating: number;
  images: string[];
  buttonLabel: "Add to cart" | "Select options";
  isFeatured?: boolean;
}

export const PRODUCTS: FynodeProduct[] = [
  {
    id: "ms920",
    title: "Wireless Gaming Headphones MS920",
    brand: "Headphones",
    price: 75.66,
    originalPrice: 85.66,
    salePercent: 12,
    rating: 4.67,
    images: [
      "/images/fynode/01-51.jpg",
      "/images/fynode/02-45.jpg",
      "/images/fynode/03-33.jpg",
    ],
    buttonLabel: "Add to cart",
  },
  {
    id: "dm420",
    title: "Wireless Gaming Headphones DM420",
    brand: "Headphones",
    salePercent: 8,
    rating: 3.67,
    images: ["/images/fynode/01-50.jpg", "/images/fynode/02-44.jpg"],
    buttonLabel: "Select options",
  },
  {
    id: "w75-lambo",
    title: "W75 Automobili Lamborghini Headphones",
    brand: "Headphones",
    price: 247.55,
    originalPrice: 303.45,
    salePercent: 19,
    rating: 3.67,
    images: ["/images/fynode/01-49.jpg", "/images/fynode/02-43.jpg"],
    buttonLabel: "Add to cart",
  },
  {
    id: "neuro-anc",
    title: "Smart EEG Active Noise-Cancelling Neuro",
    brand: "Headphones",
    price: 48.9,
    originalPrice: 74.66,
    salePercent: 35,
    rating: 4.33,
    images: ["/images/fynode/01-41.jpg", "/images/fynode/02-36.jpg"],
    buttonLabel: "Add to cart",
  },
  {
    id: "rw98-bugatti",
    title: "RW98 Bugatti Headphones",
    brand: "Headphones",
    price: 389.52,
    originalPrice: 447.22,
    salePercent: 13,
    rating: 3.67,
    images: ["/images/fynode/01-37.jpg", "/images/fynode/02-32.jpg"],
    buttonLabel: "Add to cart",
  },
  {
    id: "mh40-uniform",
    title: "MH40 L_UNIFORM Headphones",
    brand: "Headphones",
    price: 88.45,
    originalPrice: 115.78,
    salePercent: 24,
    rating: 4.0,
    images: ["/images/fynode/01-28.jpg", "/images/fynode/02-24.jpg"],
    buttonLabel: "Add to cart",
  },
  {
    id: "sw85-anc",
    title: "Active Noise-Cancelling SW85",
    brand: "Bluetooth Headphones",
    price: 107.85,
    originalPrice: 214.99,
    salePercent: 50,
    rating: 3.67,
    images: ["/images/fynode/01-3.jpg", "/images/fynode/02-2.jpg"],
    buttonLabel: "Add to cart",
  },
  {
    id: "rw75-anc",
    title: "Active Noise-Cancelling RW75",
    brand: "Headphones",
    salePercent: 14,
    rating: 3.33,
    images: ["/images/fynode/01-2.jpg", "/images/fynode/02-1.jpg"],
    buttonLabel: "Select options",
  },
];

/* Carousel sections shown on the homepage */
export interface ProductCarousel {
  id: string;
  title: string;
  subtitle?: string;
  products: FynodeProduct[];
}

const [p1, p2, p3, p4, p5, p6, p7, p8] = PRODUCTS;

export const PRODUCT_CAROUSELS: ProductCarousel[] = [
  {
    id: "most-sold",
    title: "Most sold this week",
    subtitle: "Top-rated gear our customers love",
    products: [p1, p2, p3, p4, p5, p6],
  },
  {
    id: "premium-standards",
    title: "Premium Standards",
    subtitle: "Iconic audio, engineered to perform",
    products: [p7, p8, p3, p5, p1, p4],
  },
];

/* ------------------------------------------------------------------ */
/* Promo / campaign banner                                             */
/* ------------------------------------------------------------------ */

export const CAMPAIGN_BANNER = {
  eyebrow: "Capture Every Detail",
  title: "Redefine Your Sound with Precision Microphones",
  description:
    "Highest quality audio gear for creators, streamers, and professionals who demand clarity.",
  image: "/images/fynode/collection-speakers.jpg",
  cta: { label: "View Products", href: "/category/microphones" },
};

/* ------------------------------------------------------------------ */
/* Testimonials & stats                                                */
/* ------------------------------------------------------------------ */

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I've been using this product for a month now, and I've had no issues. The customer service is top-notch, and the product is exactly as described.",
    author: "Sinan",
    role: "Verified Buyer",
    rating: 5,
  },
  {
    quote:
      "The sound quality exceeded my expectations. Delivery was fast and the unboxing experience felt truly premium. Highly recommended!",
    author: "Sarah K.",
    role: "Verified Buyer",
    rating: 5,
  },
  {
    quote:
      "Best customer service I've experienced from an electronics store. They helped me pick the perfect headphones for my budget.",
    author: "Michael T.",
    role: "Verified Buyer",
    rating: 4,
  },
  {
    quote:
      "Sleek design, amazing build quality, and the warranty process was painless. I'll definitely be shopping here again.",
    author: "Aarav M.",
    role: "Verified Buyer",
    rating: 5,
  },
];

export const STATS = [
  { value: "1.5k", label: "Happy Customers" },
  { value: "300k", label: "Total Sales per Month" },
];

/* ------------------------------------------------------------------ */
/* Journal / blog                                                      */
/* ------------------------------------------------------------------ */

export interface JournalPost {
  title: string;
  category: string;
  date: string;
  image: string;
  excerpt: string;
}

export const JOURNAL_POSTS: JournalPost[] = [
  {
    title: "Essential Tips for Maintaining Your Electronic Devices",
    category: "Tech Tips",
    date: "January 2, 2025",
    image: "/images/fynode/blog-1.jpg",
    excerpt:
      "Extend the lifespan of your electronics with these simple, practical maintenance habits.",
  },
  {
    title: "Top 5 Home Electronics to Upgrade Your Living Space",
    category: "Guides",
    date: "December 18, 2024",
    image: "/images/fynode/blog-2.jpg",
    excerpt:
      "From smart speakers to ambient lighting, these upgrades transform how your home feels.",
  },
  {
    title: "How to Choose the Perfect Smartphone: A Buyer's Guide",
    category: "Buying Guide",
    date: "December 2, 2024",
    image: "/images/fynode/blog-3.jpg",
    excerpt:
      "Camera, battery, display, ecosystem — a no-nonsense framework for your next upgrade.",
  },
];

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export const FOOTER_FEATURES = [
  {
    icon: "/images/fynode/footer.png",
    title: "Customer service",
    description: "It's not actually free we just price it into the products.",
  },
  {
    icon: "/images/fynode/footer2.png",
    title: "Fast Free Shipping",
    description: "Get free shipping on orders of $150 or more (within the US)",
  },
  {
    icon: "/images/fynode/footer3.png",
    title: "Returns & Exchanges",
    description: "We offer free returns and exchanges within 30 days of purchase.",
  },
  {
    icon: "/images/fynode/footer4.png",
    title: "Secure payment",
    description: "Your payment information is processed securely and encrypted.",
  },
];

export const FOOTER_COLUMNS = [
  {
    title: "Get to Know Us",
    links: [
      { label: "About EMIVO", href: "/about" },
      { label: "Careers", href: "#" },
      { label: "Investor Relations", href: "#" },
      { label: "EMIVO Devices", href: "#" },
      { label: "Customer reviews", href: "#" },
      { label: "Social Responsibility", href: "#" },
      { label: "Store Locations", href: "#" },
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Your Orders", href: "/account" },
      { label: "Returns & Replacements", href: "#" },
      { label: "Shipping Rates & Policies", href: "#" },
      { label: "Refund and Returns Policy", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms and Conditions", href: "#" },
    ],
  },
];

export const PAYMENT_METHODS = [
  "/images/fynode/payment.png",
  "/images/fynode/payment2.png",
  "/images/fynode/payment3.png",
  "/images/fynode/payment4.png",
  "/images/fynode/payment5.png",
];
