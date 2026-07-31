"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, BrainCircuit, X, Sparkles, SlidersHorizontal, Check, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AILandingPage() {
  const [step, setStep] = useState(0);

  const transitionConfig = { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const };

  // AI "Thinking" Sequence for Demo
  const triggerAI = () => {
    setStep(1);
    setTimeout(() => setStep(2), 2500); // Analysis complete
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] overflow-hidden relative">
      {/* Cinematic Ambient Background */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-[var(--color-accent)]/10 to-transparent -z-10 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="container mx-auto px-4 h-24 flex items-center justify-between relative z-20">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-foreground)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Shopping</span>
        </Link>
        <div className="flex items-center gap-2 bg-[var(--color-surface)]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[var(--color-border)] shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wider uppercase text-[var(--color-foreground)]">EMIVO AI Active</span>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-12 pb-32 max-w-5xl relative z-10">
        <AnimatePresence mode="wait">
          {/* STEP 0: The Prompt */}
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={transitionConfig}
              className="flex flex-col items-center justify-center text-center mt-20"
            >
              <div className="w-24 h-24 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center mb-8 relative border border-[var(--color-border)] shadow-2xl">
                <BrainCircuit className="w-10 h-10 text-[var(--color-accent)]" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-1 border-2 border-dashed border-[var(--color-accent)]/30 rounded-full"
                />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-[var(--color-foreground)] mb-6 tracking-tight leading-tight max-w-3xl">
                What are you looking for today?
              </h1>
              <p className="text-xl text-[var(--color-text-secondary)] mb-12 max-w-2xl font-light">
                Speak naturally. Describe your needs, your budget, or your lifestyle. EMIVO AI will curate the perfect setup and handle the financing.
              </p>

              {/* The "Microphone" Input */}
              <div className="relative w-full max-w-2xl group cursor-pointer" onClick={triggerAI}>
                <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-[var(--radius-full)] opacity-20 blur-lg group-hover:opacity-40 transition-opacity duration-500" />
                <div className="relative flex items-center gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] p-2 rounded-[var(--radius-full)] shadow-xl">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                    <Mic className="w-7 h-7 text-[var(--color-on-primary)]" />
                  </div>
                  <div className="flex-1 text-left py-2">
                    <div className="text-sm font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1">Click to simulate</div>
                    <div className="text-lg text-[var(--color-text-primary)] font-medium">
                      "I need a premium phone for photography, under ₹4,000 a month."
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 1: The Analysis Phase */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={transitionConfig}
              className="flex flex-col items-center justify-center mt-32"
            >
              <div className="flex items-center gap-6 mb-12">
                <motion.div animate={{ height: [20, 60, 20] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 bg-[var(--color-primary)] rounded-full" />
                <motion.div animate={{ height: [40, 80, 40] }} transition={{ duration: 1, delay: 0.2, repeat: Infinity }} className="w-2 bg-[var(--color-accent)] rounded-full" />
                <motion.div animate={{ height: [30, 70, 30] }} transition={{ duration: 1, delay: 0.4, repeat: Infinity }} className="w-2 bg-[var(--color-primary)] rounded-full" />
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-foreground)] mb-4">Analyzing your request...</h2>
              <div className="flex flex-col gap-3 text-[var(--color-text-secondary)]">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Extracting intent: Photography</motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Constraint: Premium tier</motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Constraint: Under ₹4,000/mo EMI</motion.div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: The Rich UI Recommendation */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transitionConfig}
            >
              {/* AI Voice Bubble */}
              <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 mb-12 relative overflow-hidden shadow-[var(--shadow-lg)]">
                <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit className="w-32 h-32 text-[var(--color-foreground)]" /></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-[var(--color-on-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--color-foreground)] mb-4">Here is the perfect match.</h3>
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
                      Based on your need for <span className="font-bold text-[var(--color-foreground)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded">premium photography</span>, the iPhone 15 Pro is the best choice. It features a 48MP main camera and Photonic Engine.
                      <br /><br />
                      I have configured a <span className="font-bold text-[var(--color-foreground)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded">24-month EMI plan at ₹3,950/mo</span>, which fits perfectly under your ₹4,000 budget. 
                      There is a verified retailer 2.4 km away who has this in stock today.
                    </p>
                  </div>
                </div>
              </div>

              {/* The Curated Product Card (Not standard PLP card, highly specific to AI) */}
              <div className="grid md:grid-cols-12 gap-8">
                <div className="md:col-span-8">
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-md)] flex flex-col md:flex-row group hover:shadow-2xl transition-shadow cursor-pointer relative">
                    <div className="w-full md:w-1/2 aspect-square relative bg-[var(--color-surface-elevated)] p-8 flex items-center justify-center">
                      <motion.img 
                        src="https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=1000&auto=format&fit=crop" 
                        alt="iPhone 15 Pro" 
                        className="object-contain w-full h-full drop-shadow-2xl group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                      <div className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest mb-2">99% Match</div>
                      <h4 className="text-3xl font-bold text-[var(--color-foreground)] mb-4">iPhone 15 Pro</h4>
                      <ul className="space-y-3 mb-8 relative z-10">
                        <li className="flex items-center gap-3 text-[var(--color-text-secondary)] font-medium">
                          <Check className="w-5 h-5 text-green-500 shrink-0" />
                          48MP Pro Camera System
                        </li>
                        <li className="flex items-center gap-3 text-[var(--color-text-secondary)] font-medium">
                          <Check className="w-5 h-5 text-green-500 shrink-0" />
                          A17 Pro Chip
                        </li>
                      </ul>
                      <div className="mt-auto pt-6 border-t border-[var(--color-border)] flex items-center justify-between relative z-10">
                        <div>
                          <div className="text-sm font-medium text-[var(--color-text-secondary)]">Your Custom EMI</div>
                          <div className="text-3xl font-bold text-[var(--color-accent)]">₹3,950<span className="text-base font-normal">/mo</span></div>
                        </div>
                        <Link href="/product/p_001" className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center group-hover:bg-[var(--color-accent)] transition-colors">
                          <ArrowRight className="w-5 h-5 text-[var(--color-on-primary)]" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Competitor Comparison */}
                <div className="md:col-span-4 flex flex-col gap-6">
                  <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 h-full flex flex-col">
                    <h5 className="font-bold text-[var(--color-foreground)] mb-6 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" /> Why this beats the alternative
                    </h5>
                    <div className="space-y-4 flex-1">
                      <div className="p-4 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] opacity-60">
                        <div className="text-sm font-semibold mb-1 text-[var(--color-foreground)]">Galaxy S24 Ultra</div>
                        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">Also great, but EMI starts at ₹4,200/mo (over your budget limit).</div>
                      </div>
                      <div className="p-4 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] opacity-60">
                        <div className="text-sm font-semibold mb-1 text-[var(--color-foreground)]">iPhone 15 (Standard)</div>
                        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">Fits budget, but lacks the pro-level 48MP raw photography you requested.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 text-center">
                <button className="text-[var(--color-text-secondary)] hover:text-[var(--color-foreground)] font-medium transition-colors" onClick={() => setStep(0)}>
                  Ask something else
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
