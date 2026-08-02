import Image from "next/image"
import Link from "next/link"
import { 
  HERO_BANNERS, 
  CATEGORIES, 
  getNewArrivals, 
  getProductsByCategory,
  FEATURE_BANNERS,
  BRAND_LOGOS
} from "@/lib/emivo-data"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export default function Home() {
  const newArrivals = getNewArrivals().slice(0, 4)
  const topHeadphones = getProductsByCategory("headphones").slice(0, 4)

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. Hero Section - Static first banner for now (can map later to carousel) */}
      <section className="relative w-full h-[600px] md:h-[70vh] min-h-[500px] bg-[#12213B] overflow-hidden flex items-center">
        <div className="absolute inset-0 z-0">
          {/* Decorative background — overlay text conveys the message, so
              the image is marked empty for screen readers. */}
          <Image
            src={HERO_BANNERS[0].image}
            alt=""
            fill sizes="100vw" className="object-cover opacity-60 mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#12213B] via-[#12213B]/80 to-transparent" />
        </div>
        
        <div className="container-emivo relative z-10 flex flex-col items-start max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-accent mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wide uppercase">AI-Approved Deals</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-white leading-tight whitespace-pre-line mb-6">
            {HERO_BANNERS[0].title}
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-lg">
            {HERO_BANNERS[0].subtitle}
          </p>
          
          <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href={HERO_BANNERS[0].ctaHref}>
              {HERO_BANNERS[0].ctaText}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 2. Brand Marquee */}
      <div className="w-full bg-white border-y border-border py-8 overflow-hidden flex">
        <div className="flex shrink-0 animate-marquee items-center gap-16 px-8 h-12">
           {/* First copy read aloud; the second (seamless-loop duplicate) is
               aria-hidden so brand names aren't announced twice. */}
           {BRAND_LOGOS.map((brand, i) => (
             <div key={i} className="relative w-32 h-10 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all">
               <Image
                 src={brand.src}
                 alt={brand.name}
                 fill sizes="128px" className="object-contain"
               />
             </div>
           ))}
           {BRAND_LOGOS.map((brand, i) => (
             <div key={`dup-${i}`} aria-hidden="true" className="relative w-32 h-10 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all">
               <Image
                 src={brand.src}
                 alt=""
                 fill sizes="128px" className="object-contain"
               />
             </div>
           ))}
        </div>
      </div>

      {/* 3. Shop by Category */}
      <section className="container-emivo py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Shop by Category</h2>
            <p className="text-secondary mt-2">Find exactly what you're looking for</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} href={`/products?category=${cat.slug}`} className="group relative block aspect-[4/5] md:aspect-square overflow-hidden rounded-xl bg-surface border border-border">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <Image 
                src={cat.image}
                alt={cat.name}
                fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 p-6 z-20">
                <h3 className="text-xl font-bold text-white mb-1">{cat.name}</h3>
                <p className="text-white/80 text-sm font-medium">{cat.productCount} Products</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. New Arrivals (Products Grid) */}
      <section className="bg-white py-16 border-y border-border">
        <div className="container-emivo">
          <div className="flex items-end justify-between mb-8">
             <div>
               <div className="flex items-center gap-2 text-accent mb-2">
                 <Sparkles className="w-4 h-4 fill-accent" />
                 <span className="text-sm font-semibold tracking-wider uppercase">Curated For You</span>
               </div>
               <h2 className="text-3xl font-heading font-bold tracking-tight">New Arrivals</h2>
             </div>
             <Button variant="link" asChild className="hidden md:flex">
               <Link href="/products">View All <ArrowRight className="ml-1 w-4 h-4" /></Link>
             </Button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
          
          <Button variant="outline" className="w-full mt-8 md:hidden" asChild>
             <Link href="/products">View All Arrivals</Link>
          </Button>
        </div>
      </section>

      {/* 5. Feature Banners */}
      <section className="container-emivo py-16">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {FEATURE_BANNERS.map((banner, i) => (
             <div key={banner.id} className="relative h-[300px] md:h-[400px] sm:aspect-[4/3] w-full rounded-2xl overflow-hidden group">
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-start z-10">
                  <h3 className="text-2xl font-bold text-white mb-2">{banner.title}</h3>
                  <p className="text-white/80 mb-6">{banner.description}</p>
                  <Button variant="outline" className="bg-white/10 hover:bg-white text-white hover:text-black border-white/20 backdrop-blur-sm" asChild>
                    <Link href={banner.ctaHref}>{banner.ctaText}</Link>
                  </Button>
                </div>
             </div>
           ))}
         </div>
      </section>
      
      {/* 6. Trending in Headphones */}
      <section className="bg-white py-16 border-t border-border">
        <div className="container-emivo">
          <div className="flex items-end justify-between mb-8">
             <h2 className="text-3xl font-heading font-bold tracking-tight">Trending in Headphones</h2>
             <Button variant="link" asChild className="hidden md:flex">
               <Link href="/products?category=headphones">View Collection <ArrowRight className="ml-1 w-4 h-4" /></Link>
             </Button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {topHeadphones.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
