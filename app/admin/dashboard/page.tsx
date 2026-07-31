"use client";

import { motion } from "framer-motion";
import { Activity, ShieldAlert, Cpu, Network, ArrowRight, CheckCircle2, ChevronRight, Fingerprint, Database, Server } from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
export default function AdminDashboard() {
  const transitionConfig = { duration: 0.4, ease: "linear" as const };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: transitionConfig }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-foreground)]">
      
      {/* Vercel/Linear style Top Nav */}
      <div className="border-b border-[var(--color-border)] sticky top-0 z-30 bg-[var(--color-background)]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold font-display uppercase tracking-wider text-[var(--color-primary)]">EMIVO</Link>
            <ChevronRight className="w-4 h-4 text-[var(--color-secondary)]" />
            <div className="flex items-center gap-2 text-[var(--color-secondary)] font-medium">
              <ShieldAlert className="w-4 h-4" /> HQ Command Center
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[var(--color-secondary)] font-mono">System Nominal</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
            <p className="text-[var(--color-secondary)]">Live telemetry and financial volume across India.</p>
          </motion.div>

          {/* Core Metrics Grid (Vercel Style Cards) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Gross Merchandise Value (30d)", value: formatINR(142500000), trend: "+12.4%", trendUp: true },
              { label: "Active Retail Partners", value: "1,248", trend: "+42", trendUp: true },
              { label: "AI Disbursed EMI Volume", value: formatINR(84000000), trend: "+24.1%", trendUp: true },
              { label: "System API Latency", value: "42ms", trend: "-12ms", trendUp: true },
            ].map((metric, idx) => (
              <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 hover:border-[var(--color-accent)] transition-colors">
                <div className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-3">{metric.label}</div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold font-mono tracking-tight">{metric.value}</div>
                  <div className={`text-sm font-medium ${metric.trendUp ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                    {metric.trendUp ? '↑' : '↓'} {metric.trend}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Split Layout: Graph & Feed */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Main Analytics Area */}
            <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[var(--color-accent)]" /> 
                    Transaction Topology
                  </h3>
                  <select className="bg-[var(--color-background)] border border-[var(--color-border)] text-sm rounded px-3 py-1">
                    <option>Last 24 Hours</option>
                    <option>Last 7 Days</option>
                  </select>
                </div>
                
                {/* Mock Graph using flex blocks for a "Linear" aesthetic */}
                <div className="h-64 flex items-end justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                  {[40, 25, 60, 45, 80, 55, 90, 75, 100, 85, 60, 70].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                        className="w-full bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] rounded-t-sm transition-colors relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-foreground)] text-[var(--color-background)] text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap">
                          {height}k txns
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-[var(--color-secondary)] mt-2 font-mono">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>24:00</span>
                </div>
              </div>

              {/* Infrastructure Status */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { name: "Payment Gateway", status: "Operational", icon: Database },
                  { name: "AI Inference (L2)", status: "Operational", icon: Cpu },
                  { name: "Partner API", status: "Operational", icon: Network }
                ].map((infra, idx) => (
                  <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 flex items-center gap-4">
                    <infra.icon className="w-5 h-5 text-[var(--color-secondary)]" />
                    <div>
                      <div className="text-sm font-semibold">{infra.name}</div>
                      <div className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {infra.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </motion.div>

            {/* Live Audit Log (Sidebar) */}
            <motion.div variants={itemVariants} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-elevated)]">
                <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--color-secondary)]">
                  <Server className="w-4 h-4" /> Live Audit Stream
                </h3>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {[
                  { actor: "sys_auth", action: "Token Rotated", resource: "user_8492", time: "Just now" },
                  { actor: "razorpay_wh", action: "Payment Confirmed", resource: "order_9921", time: "2m ago" },
                  { actor: "ai_agent_l3", action: "EMI Approved", resource: "loan_4412", time: "5m ago", highlight: true },
                  { actor: "retail_app", action: "Stock Decremented", resource: "sku_iphone15p", time: "12m ago" },
                  { actor: "customer_web", action: "Checkout Initiated", resource: "cart_8812", time: "15m ago" },
                  { actor: "sys_cron", action: "Commission Settled", resource: "batch_49", time: "1h ago" },
                  { actor: "ai_agent_l1", action: "Intent Parsed", resource: "chat_001", time: "1h ago" },
                ].map((log, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="mt-1 text-[var(--color-secondary)] font-mono text-xs w-12 shrink-0">{log.time}</div>
                    <div className={`p-3 rounded-md border ${log.highlight ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20' : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)]'} flex-1`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-[var(--color-primary)]">{log.actor}</span>
                        <ArrowRight className="w-3 h-3 text-[var(--color-secondary)]" />
                      </div>
                      <div className="font-semibold text-[var(--color-foreground)]">{log.action}</div>
                      <div className="text-xs text-[var(--color-secondary)] mt-1 font-mono">{log.resource}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
