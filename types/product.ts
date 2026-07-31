export type MediaType = "image" | "video" | "360" | "AR";

export interface MediaAsset {
  type: MediaType;
  url: string;
  alt: string;
  colorId?: string; // Links this asset to a specific product color
}

// ----------------------------------------------------
// Story Blocks Architecture (Phase E Refactor)
// ----------------------------------------------------

export type BlockType = 
  | "MediaBlock" 
  | "TextBlock" 
  | "SpecBlock" 
  | "ComparisonBlock" 
  | "QuoteBlock" 
  | "VideoBlock" 
  | "FeatureGrid" 
  | "StatsBlock";

export interface StoryBlock {
  type: BlockType;
  title?: string;
  content?: string;
  media?: MediaAsset[];
  features?: { title: string; description: string; icon?: string }[];
  stats?: { value: string; label: string }[];
  quote?: { text: string; author: string; role: string };
  align?: "left" | "center" | "right";
  // Used by the Story Engine for entrance/scroll animations
  animationType?: "fade-up" | "lens-assemble" | "parallax" | "scale-in" | "titanium-glow";
}

export type SectionType = 
  | "hero"
  | "design"
  | "camera"
  | "performance"
  | "battery"
  | "display"
  | "ai"
  | "ecosystem"
  | "specs"
  | "reviews";

export interface StorySection {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  blocks: StoryBlock[];
}

// ----------------------------------------------------
// Commerce Types
// ----------------------------------------------------

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  hex?: string; // For colors
  priceModifier?: number;
}

export interface FinanceOption {
  provider: string;
  monthlyEMI: number;
  months: number;
  tag?: string; // e.g. "No Cost EMI"
}

export interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  isVerified?: boolean;
  helpfulCount?: number;
  photos?: string[];
}

export interface ReviewSummary {
  overallRating: number;
  reviewsCount: number;
  aiSummary: string;
  ratingDistribution: Record<number, number>; // { 5: 80, 4: 15, ... }
}

export interface CompareModel {
  id: string;
  name: string;
  image: string;
  price: number;
  baseEMI: number;
  quickSpecs: {
    camera: string;
    display: string;
    battery: string;
    performance: string;
  };
  fullSpecs: Record<string, string>;
}

export interface BundleAccessory {
  id: string;
  name: string;
  price: number;
  mrp: number;
  image: string;
}

export interface Recommendation {
  productId: string;
  reason: string; // e.g. "Better battery"
}

export interface Product {
  id: string;
  brand: string;
  title: string;
  category: string;
  tagline: string;
  basePrice: number;
  mrp: number;
  baseEMI: number;
  rating: number;
  reviewsCount: number;
  isNew?: boolean;
  gallery: MediaAsset[];
  colors: ProductVariant[];
  storageOptions: ProductVariant[];
  financeOptions: FinanceOption[];
  deliveryEstimate: string;
  warranty: string;
  retailerInfo: string;
  exchangeAvailable?: boolean;
  storySections: StorySection[];
  featuredReviews?: Review[];
  reviewSummary?: ReviewSummary;
  accessories?: BundleAccessory[];
  compareModels?: CompareModel[];
  recommendations?: Recommendation[];
}
