"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, ShoppingBag, ArrowUpRight, Zap, Store, MapPin } from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";

export default function RetailDashboard() {
  const transitionConfig = { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: transitionConfig }
  };

  // KPI Stories (instead of boring charts)
  const stories = [
    {
      title: "Surge in iPhone 15 Demand",
      metric: "+124%",
      description: "In the last 48 hours, 32 customers in your 5km radius purchased an iPhone 15 Pro via EMIVO EMI. You fulfilled 12 of them.",
      color: "bg-blue-500",
      icon: TrendingUp
    },
    {
      title: "EMI Conversion Rate",
      metric: "89%",
      description: "Your store's EMI approval rate is higher than the city average. Customers are completing checkout 3x faster.",
      color: "bg-green-500",
      icon: Zap
    },
    {
      title: "Footfall to Sale",
      metric: "12 mins",
      description: "Average time from a customer walking into your store to finalizing an EMI payment. Down from 45 mins last month.",
      color: "bg-purple-500",
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-[var(--color-primary)] font-display uppercase">EMIVO</Link>
            <div className="h-4 w-px bg-[var(--color-border)]" />
            <div className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Store className="w-4 h-4 text-[var(--color-accent)]" />
              Retail Partner Portal
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold flex items-center gap-2 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Online
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-foreground)] mb-2">Good morning, Sharma Electronics.</h1>
              <p className="text-[var(--color-secondary)] flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Kormangala, Bangalore • 4.8 Store Rating
              </p>
            </div>
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-6 py-4 rounded-[var(--radius-lg)]">
              <div className="text-sm font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1">Today's Earnings (Commission)</div>
              <div className="text-3xl font-bold text-[var(--color-accent)]">{formatINR(4250000)}</div>
            </div>
          </motion.div>

          {/* KPI Stories (The Core Vision) */}
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-6">Business Insights</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {stories.map((story, i) => (
                <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 hover:border-[var(--color-accent)] transition-colors group">
                  <div className={`w-12 h-12 rounded-full ${story.color}/10 flex items-center justify-center mb-6`}>
                    <story.icon className={`w-6 h-6 text-${story.color.split('-')[1]}-500`} />
                  </div>
                  <div className="text-4xl font-bold text-[var(--color-foreground)] mb-2 group-hover:scale-105 transition-transform origin-left">{story.metric}</div>
                  <h3 className="font-bold text-[var(--color-foreground)] mb-2">{story.title}</h3>
                  <p className="text-sm text-[var(--color-secondary)] leading-relaxed">{story.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Active Orders Map / Status */}
          <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--color-foreground)]">Live Dispatch Radar</h3>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Live</span>
              </div>
              <div className="flex-1 relative min-h-[300px] bg-[var(--color-background)]">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                
                {/* Radar Sweep Animation */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -mt-[300px] -ml-[300px] rounded-full border border-green-500/10 pointer-events-none"
                >
                  <div className="w-1/2 h-1/2 border-r-2 border-green-500/50 rounded-tr-full bg-gradient-to-tr from-transparent to-green-500/10" />
                </motion.div>
                
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-green-500 rounded-full -ml-2 -mt-2 shadow-[0_0_20px_rgba(34,197,94,1)]">
                  <div className="absolute top-6 -left-12 bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1 rounded text-xs font-bold w-max shadow-lg">Your Store</div>
                </div>

                <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]">
                  <div className="absolute top-4 -left-8 bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded text-xs font-medium w-max">Delivery #8472</div>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6">
              <h3 className="font-bold text-[var(--color-foreground)] mb-6">Action Required</h3>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-between group cursor-pointer hover:border-[var(--color-accent)] transition-colors">
                    <div>
                      <div className="font-bold text-sm mb-1 text-[var(--color-foreground)]">Order #{8000 + i}</div>
                      <div className="text-xs text-[var(--color-secondary)]">Ready for pickup</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center group-hover:bg-[var(--color-primary)] transition-colors">
                      <ArrowUpRight className="w-4 h-4 text-[var(--color-primary)] group-hover:text-[var(--color-on-primary)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
