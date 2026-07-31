import { Hero } from "@/components/home/hero";
import { BrandMarquee } from "@/components/home/brand-marquee";
import { AiPicks } from "@/components/home/ai-picks";
import { BentoEcosystems } from "@/components/home/bento-ecosystems";
import { CheckoutDrawer } from "@/components/checkout-drawer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Chapter 1: The Cinematic Hero (Apple Style Transitions) */}
      <Hero />
      
      {/* Chapter 2: The Authority Wall */}
      <BrandMarquee />
      
      {/* Chapter 3: The Invisible Sales Engineer */}
      <div className="py-24 bg-gray-50">
        <div className="container-emivo">
          <div className="mb-12 flex flex-col items-center text-center">
            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-4">EMIVO Intelligence</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">Curated specifically for you.</h2>
            <p className="text-xl text-gray-500 max-w-2xl">
              Our AI analyzes millions of reviews and specifications to recommend the exact hardware you need. No more guessing.
            </p>
          </div>
          <AiPicks />
        </div>
      </div>

      {/* Chapter 4: Massive Editorial Campaign (Fynode Style Merchandising) */}
      <div className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden bg-[#09090B]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1550009158-9effb61970eb?q=80&w=2000&auto=format&fit=crop" 
            alt="Gaming Campaign" 
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl">
          <span className="text-sm font-bold tracking-[0.3em] uppercase text-red-500 mb-6 block">The Pro Gaming Event</span>
          <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
            Power.<br/>Redefined.
          </h2>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto font-light">
            Discover desktop-class performance engineered into the world's thinnest chassis. The rules have changed.
          </p>
          <a href="/category/gaming" className="inline-flex h-14 items-center justify-center rounded-full bg-white px-10 text-lg font-bold text-black transition-transform hover:scale-105">
            Explore the Collection
          </a>
        </div>
      </div>

      {/* Chapter 5: Category Ecosystems */}
      <div className="py-32 bg-white">
        <div className="container-emivo">
          <div className="mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">Explore by Ecosystem</h2>
            <p className="text-xl text-gray-500">Don't just buy a device. Buy into a seamless experience.</p>
          </div>
          <BentoEcosystems />
        </div>
      </div>
      
      {/* Chapter 6: The Tech Journal (Minimal Typography) */}
      <div className="py-24 bg-[#F5F5F7]">
        <div className="container-emivo">
          <div className="flex items-end justify-between mb-12 border-b border-black/10 pb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">The Journal</h2>
              <p className="text-gray-500 mt-2">Latest insights from our editorial team.</p>
            </div>
            <a href="/blog" className="text-sm font-bold tracking-wide uppercase hover:text-blue-600 transition-colors">View All</a>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <a key={i} href="#" className="group block">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 mb-6">
                  <img 
                    src={`https://images.unsplash.com/photo-1550009158-9effb61970eb?q=80&w=800&auto=format&fit=crop`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                </div>
                <div className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-3">Reviews</div>
                <h3 className="text-xl font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
                  Why the M3 MacBook Air is the only laptop 90% of people need.
                </h3>
              </a>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
