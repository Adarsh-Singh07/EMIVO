"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function BentoEcosystems() {
  return (
    <section className="py-24 bg-[var(--color-surface)]">
      <div className="container-emivo">
        <div className="mb-12">
          <span className="text-eyebrow mb-2 block">Ecosystems</span>
          <h2 className="text-heading text-[var(--color-foreground)]">Find your world.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          {/* Apple Ecosystem - Large Bento */}
          <Link href="/category/apple" className="group block md:col-span-2 md:row-span-2 relative rounded-[var(--radius-bento)] overflow-hidden bg-white shadow-sm hover:shadow-2xl transition-shadow duration-premium">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
            <img 
              src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=1200&auto=format&fit=crop" 
              alt="Apple Ecosystem"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-premium ease-premium"
            />
            <div className="absolute bottom-10 left-10 z-20 text-white">
              <h3 className="text-4xl font-bold tracking-tight mb-2">The Apple Ecosystem</h3>
              <p className="text-lg text-white/80 flex items-center gap-2">Explore Mac, iPad, and iPhone <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" /></p>
            </div>
          </Link>

          {/* Gaming - Tall Bento */}
          <Link href="/category/gaming" className="group block md:row-span-2 relative rounded-[var(--radius-bento)] overflow-hidden bg-[#09090B] shadow-sm hover:shadow-xl transition-shadow duration-premium">
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
            <img 
              src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=600&auto=format&fit=crop" 
              alt="Gaming"
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-premium ease-premium"
            />
            <div className="absolute bottom-10 left-8 z-20 text-white">
              <h3 className="text-3xl font-bold tracking-tight mb-2">Pro Gaming</h3>
              <p className="text-sm text-white/80 flex items-center gap-2">Laptops & Consoles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></p>
            </div>
          </Link>

          {/* Audio - Small Bento */}
          <Link href="/category/audio" className="group block relative rounded-[var(--radius-bento)] overflow-hidden bg-white shadow-sm hover:shadow-xl transition-shadow duration-premium">
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
             <img 
              src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=600&auto=format&fit=crop" 
              alt="Audio"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-premium ease-premium"
            />
            <div className="absolute bottom-8 left-8 z-20 text-white">
              <h3 className="text-2xl font-bold tracking-tight mb-1">Spatial Audio</h3>
              <p className="text-sm flex items-center gap-2">Listen now <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></p>
            </div>
          </Link>
          
          {/* Smart Home - Small Bento */}
          <Link href="/category/smart-home" className="group block md:col-span-2 relative rounded-[var(--radius-bento)] overflow-hidden bg-stone-100 shadow-sm hover:shadow-xl transition-shadow duration-premium">
            <div className="absolute inset-0 flex flex-col justify-center px-12 z-20">
              <h3 className="text-3xl font-bold tracking-tight text-black mb-2">Smart Home</h3>
              <p className="text-sm text-gray-600 flex items-center gap-2">Automate your life <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></p>
            </div>
             <img 
              src="https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop" 
              alt="Smart Home"
              className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-40 mix-blend-multiply group-hover:scale-105 transition-transform duration-premium ease-premium"
            />
          </Link>

        </div>
      </div>
    </section>
  );
}
