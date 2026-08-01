/**
 * EMIVO Mock Product Catalog — uses Fynode demo images (user-approved).
 * All prices in paisa (1 rupee = 100 paisa).
 */

import type { Product, FinanceOption, ProductVariant } from "@/types/product";

const fyImg = (name: string) => `/images/fynode/${name}`;
function demoEMI(p: number, m: number) { return Math.round(p / m); }

export interface Category { id: string; name: string; slug: string; image: string; productCount: number; }
export const CATEGORIES: Category[] = [
  { id: "cat-headphones", name: "Headphones", slug: "headphones", image: fyImg("category-headphones.png"), productCount: 42 },
  { id: "cat-earphones",  name: "Earphones",  slug: "earphones",  image: fyImg("category-earphones.png"),  productCount: 58 },
  { id: "cat-speakers",   name: "Speakers",   slug: "speakers",   image: fyImg("category-speakers.png"),   productCount: 31 },
  { id: "cat-mics",       name: "Microphones",slug: "microphones",image: fyImg("category-microphone.png"), productCount: 24 },
];

export const BRAND_LOGOS = [
  { name: "Sony",           src: fyImg("logo-01.png") },
  { name: "Bose",           src: fyImg("logo-02.png") },
  { name: "JBL",            src: fyImg("logo-03.png") },
  { name: "Sennheiser",     src: fyImg("logo-04.png") },
  { name: "Bang & Olufsen", src: fyImg("logo-05.png") },
  { name: "AKG",            src: fyImg("logo-06.png") },
  { name: "Marshall",       src: fyImg("logo-08.png") },
];

const commonFinance = (p: number): FinanceOption[] => [
  { provider: "HDFC Bank",     months: 6,  monthlyEMI: demoEMI(p, 6),  tag: "No Cost EMI" },
  { provider: "Bajaj Finserv", months: 12, monthlyEMI: demoEMI(p, 12), tag: "Low Interest" },
  { provider: "ZestMoney",     months: 24, monthlyEMI: demoEMI(p, 24) },
];

const stdColors: ProductVariant[] = [
  { id: "c-black",  name: "Midnight Black", value: "black",  hex: "#1B1F27" },
  { id: "c-silver", name: "Lunar Silver",   value: "silver", hex: "#C4C8CD" },
];

export const PRODUCTS: Product[] = [
  {
    id: "prod-1", brand: "Sony",
    title: "WH-1000XM5 Wireless ANC Headphones", category: "headphones",
    tagline: "Industry-leading noise cancelling",
    basePrice: 2499000, mrp: 3499000, baseEMI: demoEMI(2499000, 12),
    rating: 4.7, reviewsCount: 2340, isNew: true,
    gallery: [
      { type: "image", url: fyImg("01-2.jpg"),  alt: "Sony WH-1000XM5 front" },
      { type: "image", url: fyImg("01-3.jpg"),  alt: "Sony WH-1000XM5 side" },
      { type: "image", url: fyImg("01-28.jpg"), alt: "Sony WH-1000XM5 detail" },
    ],
    colors: stdColors, storageOptions: [], financeOptions: commonFinance(2499000),
    deliveryEstimate: "Free delivery by Aug 5", warranty: "1 Year Manufacturer Warranty",
    retailerInfo: "Sound Wave Electronics, Mumbai", exchangeAvailable: true, storySections: [],
  },
  {
    id: "prod-2", brand: "JBL",
    title: "Charge 5 Portable Bluetooth Speaker", category: "speakers",
    tagline: "Powerful sound. Bold design.",
    basePrice: 1599000, mrp: 1899000, baseEMI: demoEMI(1599000, 12),
    rating: 4.5, reviewsCount: 897,
    gallery: [
      { type: "image", url: fyImg("02-1.jpg"),  alt: "JBL Charge 5 front" },
      { type: "image", url: fyImg("02-2.jpg"),  alt: "JBL Charge 5 angle" },
      { type: "image", url: fyImg("02-24.jpg"), alt: "JBL Charge 5 detail" },
    ],
    colors: [
      { id: "c-navy", name: "Deep Navy",  value: "navy", hex: "#12213B" },
      { id: "c-red",  name: "Fiesta Red", value: "red",  hex: "#D14343" },
    ],
    storageOptions: [], financeOptions: commonFinance(1599000),
    deliveryEstimate: "Delivery by Aug 6", warranty: "1 Year Manufacturer Warranty",
    retailerInfo: "Digital Hub, Delhi", storySections: [],
  },
  {
    id: "prod-3", brand: "Bose",
    title: "QuietComfort Ultra Earbuds", category: "earphones",
    tagline: "Immersive, world-class noise cancellation",
    basePrice: 2290000, mrp: 2990000, baseEMI: demoEMI(2290000, 12),
    rating: 4.6, reviewsCount: 1452, isNew: true,
    gallery: [
      { type: "image", url: fyImg("03-1.jpg"),  alt: "Bose QC Ultra front" },
      { type: "image", url: fyImg("03-2.jpg"),  alt: "Bose QC Ultra case" },
      { type: "image", url: fyImg("03-26.jpg"), alt: "Bose QC Ultra detail" },
    ],
    colors: stdColors, storageOptions: [], financeOptions: commonFinance(2290000),
    deliveryEstimate: "Free delivery by Aug 5", warranty: "2 Year Manufacturer Warranty",
    retailerInfo: "Audio Xpress, Bangalore", exchangeAvailable: true, storySections: [],
  },
  {
    id: "prod-4", brand: "Sennheiser",
    title: "HD 600 Open Back Headphones", category: "headphones",
    tagline: "Audiophile reference standard",
    basePrice: 3999000, mrp: 4499000, baseEMI: demoEMI(3999000, 12),
    rating: 4.8, reviewsCount: 680,
    gallery: [
      { type: "image", url: fyImg("04-1.jpg"), alt: "Sennheiser HD 600 front" },
      { type: "image", url: fyImg("04-7.jpg"), alt: "Sennheiser HD 600 detail" },
    ],
    colors: [{ id: "c-black", name: "Matte Black", value: "black", hex: "#1B1F27" }],
    storageOptions: [], financeOptions: commonFinance(3999000),
    deliveryEstimate: "Delivery by Aug 7", warranty: "2 Year Manufacturer Warranty",
    retailerInfo: "Pro Audio House, Pune", storySections: [],
  },
  {
    id: "prod-5", brand: "Marshall",
    title: "Stanmore III Bluetooth Speaker", category: "speakers",
    tagline: "Iconic design, legendary sound",
    basePrice: 3499000, mrp: 3999000, baseEMI: demoEMI(3499000, 12),
    rating: 4.4, reviewsCount: 512,
    gallery: [
      { type: "image", url: fyImg("collection-speakers.jpg"), alt: "Marshall Stanmore III" },
    ],
    colors: [
      { id: "c-cream", name: "Cream",        value: "cream", hex: "#F5F0E8" },
      { id: "c-black", name: "Classic Black", value: "black", hex: "#1B1F27" },
    ],
    storageOptions: [], financeOptions: commonFinance(3499000),
    deliveryEstimate: "Delivery by Aug 8", warranty: "1 Year Manufacturer Warranty",
    retailerInfo: "Sound Studio, Hyderabad", storySections: [],
  },
  {
    id: "prod-6", brand: "Sony",
    title: "WF-1000XM5 True Wireless Earbuds", category: "earphones",
    tagline: "The best gets even better",
    basePrice: 1999000, mrp: 2699000, baseEMI: demoEMI(1999000, 12),
    rating: 4.5, reviewsCount: 1820,
    gallery: [
      { type: "image", url: fyImg("01-37.jpg"), alt: "Sony WF-1000XM5 front" },
      { type: "image", url: fyImg("01-41.jpg"), alt: "Sony WF-1000XM5 case" },
    ],
    colors: stdColors, storageOptions: [], financeOptions: commonFinance(1999000),
    deliveryEstimate: "Free delivery by Aug 5", warranty: "1 Year Manufacturer Warranty",
    retailerInfo: "Tech World, Chennai", exchangeAvailable: true, storySections: [],
  },
];

export interface HeroBanner { id: string; title: string; subtitle: string; ctaText: string; ctaHref: string; image: string; bgColor: string; }
export const HERO_BANNERS: HeroBanner[] = [
  { id: "hero-1", title: "Premium Sound,\nEasy EMI",    subtitle: "Get the latest headphones with 0% interest EMI starting Rs.999/mo", ctaText: "Shop Now",           ctaHref: "/products", image: fyImg("slider-02-1.jpg"), bgColor: "#12213B" },
  { id: "hero-2", title: "Studio-Grade\nAt Home",       subtitle: "Professional microphones and speakers for every creator",           ctaText: "Explore Collection", ctaHref: "/products", image: fyImg("slider-03-1.jpg"), bgColor: "#1B1F27" },
  { id: "hero-3", title: "Summer Audio\nSale",          subtitle: "Up to 40% off on selected wireless earbuds and speakers",           ctaText: "View Deals",         ctaHref: "/products", image: fyImg("slider-03.jpg"),   bgColor: "#3B1D0D" },
];

export interface FeatureBanner { id: string; title: string; description: string; image: string; ctaText: string; ctaHref: string; }
export const FEATURE_BANNERS: FeatureBanner[] = [
  { id: "fb-1", title: "Wireless Freedom",  description: "Noise cancelling headphones built for all-day comfort", image: fyImg("banner-01.jpg"), ctaText: "Browse Headphones", ctaHref: "/products" },
  { id: "fb-2", title: "Party Speakers",    description: "Waterproof, powerful, and ready for any occasion",     image: fyImg("banner-02.jpg"), ctaText: "Browse Speakers",   ctaHref: "/products" },
  { id: "fb-3", title: "In-Ear Perfection", description: "True wireless earbuds with adaptive audio",            image: fyImg("banner-03.jpg"), ctaText: "Browse Earbuds",   ctaHref: "/products" },
];

export interface JournalPost { title: string; excerpt: string; image: string; category: string; date: string; slug: string; }
export const JOURNAL_POSTS: JournalPost[] = [
  { title: "How to Choose the Right Headphones for Your Lifestyle", excerpt: "A comprehensive guide to finding the perfect pair.", image: fyImg("blog-1.jpg"), category: "Guides",     date: "Jul 28, 2026", slug: "choose-headphones" },
  { title: "EMI vs Full Payment: What Makes Financial Sense?",      excerpt: "Breaking down the real cost of financing your gadgets.", image: fyImg("blog-2.jpg"), category: "Finance",    date: "Jul 25, 2026", slug: "emi-vs-full-payment" },
  { title: "The Rise of Spatial Audio: What You Need to Know",      excerpt: "From Dolby Atmos to Apple Spatial Audio.",             image: fyImg("blog-3.jpg"), category: "Technology", date: "Jul 22, 2026", slug: "spatial-audio-guide" },
];

export const FOOTER_LINKS = [
  { title: "Shop",    links: [{ label: "Headphones", href: "/products" }, { label: "Earphones", href: "/products" }, { label: "Speakers", href: "/products" }, { label: "Microphones", href: "/products" }, { label: "All Products", href: "/products" }] },
  { title: "Support", links: [{ label: "Track Order", href: "#" }, { label: "Returns & Exchange", href: "#" }, { label: "EMI Calculator", href: "#" }, { label: "Warranty Policy", href: "#" }, { label: "FAQs", href: "#" }] },
  { title: "Company", links: [{ label: "About EMIVO", href: "/about" }, { label: "Partner with Us", href: "#" }, { label: "Careers", href: "#" }, { label: "Press", href: "#" }, { label: "Blog", href: "#" }] },
];

export const getProductById        = (id: string)   => PRODUCTS.find((p) => p.id === id);
export const getProductsByCategory = (slug: string) => PRODUCTS.filter((p) => p.category === slug);
export const getNewArrivals        = ()              => PRODUCTS.filter((p) => p.isNew);
export const getAllProducts         = ()              => PRODUCTS;