import { use } from "react";
import { MOCK_PRODUCTS } from "@/lib/data";
import { notFound } from "next/navigation";
import { StoryEngine } from "@/components/product/story-engine";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ProductProvider } from "@/components/product/product-context";
import { ProductClientLayout } from "@/components/product/product-client-layout";
import { AccessoriesBundle } from "@/components/product/accessories-bundle";
import { CompareModels } from "@/components/product/compare-models";
import { ReviewsSection } from "@/components/product/reviews-section";
import { SimilarProducts } from "@/components/product/similar-products";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = MOCK_PRODUCTS.find((p) => p.id === id) || MOCK_PRODUCTS[0];
  
  if (!product) return notFound();

  // The Category Worlds System
  // Apple -> minimal/white, Gaming -> dark/aggressive, Cameras -> editorial/cinematic
  const isDarkTheme = product.category === "Gaming" || product.brand === "Nothing";
  
  // Override CSS variables for the dark world
  const darkThemeStyles = isDarkTheme ? {
    "--color-background": "#000000",
    "--color-surface": "#09090B",
    "--color-surface-elevated": "#1A1A1D",
    "--color-border": "rgba(255,255,255,0.1)",
    "--color-foreground": "#FFFFFF",
    "--color-secondary": "#A1A1AA",
    "--color-text-secondary": "#A1A1AA",
  } as React.CSSProperties : {};

  return (
    <ProductProvider product={product}>
      <ProductClientLayout>
        <div 
          className="min-h-screen transition-colors duration-1000 bg-[var(--color-background)] text-[var(--color-foreground)]"
          style={darkThemeStyles}
        >
          <div className="container-emivo py-8 md:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-24 items-start">
              
              {/* MOBILE TOP: GALLERY */}
              <div className="lg:hidden col-span-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                <ProductGallery />
              </div>

              {/* PURCHASE PANEL (Sticky Right on Desktop) */}
              <div className="col-span-1 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:sticky lg:top-28 z-30 order-2 lg:order-none">
                <PurchasePanel />
              </div>

              {/* LEFT: STORYTELLING CONTENT (Scrolls) */}
              <div className="col-span-1 lg:col-span-8 lg:col-start-1 lg:row-start-1 space-y-24 md:space-y-40 pb-32 order-3 lg:order-none">
                
                {/* Desktop Gallery */}
                <div className="hidden lg:block">
                  <ProductGallery />
                </div>

                {/* AI Review Synthesis Injection */}
                {product.reviewSummary && (
                  <section className={`p-8 rounded-[var(--radius-bento)] border ${isDarkTheme ? 'ai-glass border-white/10' : 'ai-glass border-black/5'} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none" />
                    <span className={`text-eyebrow mb-2 block ${isDarkTheme ? 'text-blue-300' : 'text-blue-600'}`}>AI Review Synthesis</span>
                    <p className={`text-xl font-medium leading-relaxed ${isDarkTheme ? 'text-white' : 'text-black'}`}>
                      "{product.reviewSummary.aiSummary}"
                    </p>
                    <p className={`mt-6 text-sm font-bold ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                      Based on {product.reviewsCount?.toLocaleString()} verified buyer reviews.
                    </p>
                  </section>
                )}

                <StoryEngine sections={product.storySections} />
                <CompareModels product={product} />
                <AccessoriesBundle product={product} />
                <ReviewsSection product={product} />
                <SimilarProducts product={product} />
                
              </div>
            </div>
          </div>

          {/* MOBILE STICKY FOOTER */}
          <div className={`lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t p-4 px-6 z-50 flex items-center justify-between pb-safe ${isDarkTheme ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
            <div className="flex flex-col">
              <span className={`text-xs font-bold uppercase ${isDarkTheme ? 'text-gray-400' : 'text-[var(--color-secondary)]'}`}>{product.title}</span>
              <span className={`text-lg font-bold tabular-nums ${isDarkTheme ? 'text-white' : 'text-black'}`}>₹{product.basePrice.toLocaleString('en-IN')}</span>
            </div>
            <button className={`h-12 px-8 rounded-full font-bold shadow-lg active:scale-95 transition-transform ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'}`}>
              Buy Now
            </button>
          </div>
        </div>
      </ProductClientLayout>
    </ProductProvider>
  );
}
