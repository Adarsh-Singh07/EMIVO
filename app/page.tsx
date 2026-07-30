"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { mockProducts } from "@/lib/mock/products";
import { useTheme } from "@/lib/theme";

export default function Home() {
  const { theme } = useTheme();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: theme === "a" ? 20 : 40 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: theme === "a" ? "tween" : "spring",
        duration: theme === "a" ? 0.4 : 0.6
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-surface-elevated)] to-[var(--color-surface)] -z-10" />
        
        <div className="container mx-auto px-4 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-3xl mx-auto space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium text-sm">
              <Zap className="w-4 h-4" />
              <span>The future of Indian electronics retail</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Buy what you love. <br className="hidden md:block" />
              <span className="text-[var(--color-accent)]">Pay how you like.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-[var(--color-text-secondary)]">
              EMIVO brings top-tier electronics to your doorstep with instant, transparent EMI options from 15+ providers. Zero hidden fees.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" asChild className="w-full sm:w-auto h-14 px-8 text-lg">
                <Link href="/products">
                  Shop Now <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-14 px-8 text-lg">
                <Link href="/retail/dashboard">Join as Retailer</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Value Prop Section */}
      <section className="py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: "Compare EMI Providers", desc: "View all options side-by-side. Choose the lowest interest or processing fee." },
              { icon: Zap, title: "Apply in Minutes", desc: "Instant approval process with minimal documentation required." },
              { icon: PackageOpen, title: "Track Orders Instantly", desc: "Real-time updates from store to your doorstep." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]"
              >
                <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-[var(--color-surface-elevated)] border-t border-b border-[var(--color-border)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Trending Now</h2>
            <Button variant="ghost" asChild>
              <Link href="/products">View All <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mockProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Retailer Banner */}
      <section className="py-24 bg-[var(--color-primary)] text-white">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Empowering Local Retailers</h2>
          <p className="text-xl text-white/80 mb-10">
            Join 10,000+ Indian electronics stores using EMIVO to offer instant financing to their customers.
          </p>
          <Button size="lg" variant="accent" asChild className="h-14 px-8 text-lg">
            <Link href="/retail/dashboard">Explore Retailer Dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
