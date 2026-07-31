"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CreditCard, Smartphone, Check, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const isEdge = false;

  const [step, setStep] = useState<"emi" | "pay" | "processing">("emi");
  const [tenure, setTenure] = useState(12);

  const totalAmount = 144900; // iPhone 15 Pro
  const monthlyAmount = Math.round((totalAmount * 1.15) / tenure); // 15% interest mock

  const transitionConfig = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

  const handleProcessPayment = () => {
    setStep("processing");
    setTimeout(() => {
      router.push("/checkout/success");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4 relative overflow-hidden">
      {isEdge && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-accent)]/10 rounded-full blur-[100px] pointer-events-none" />
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/products/prod_1" className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--color-foreground)]" />
          </Link>
          <div className="text-sm font-bold tracking-widest uppercase text-[var(--color-text-secondary)]">
            Checkout
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>

        <motion.div 
          layout
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
        >
          {/* Order Summary Header */}
          <div className="p-6 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex items-center gap-4">
            <div className="w-16 h-16 rounded-md bg-white p-1 shrink-0">
              <img src="https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=200&auto=format&fit=crop" alt="iPhone 15 Pro" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[var(--color-foreground)] line-clamp-1">iPhone 15 Pro</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">256GB • Natural Titanium</p>
            </div>
            <div className="text-right font-bold text-[var(--color-foreground)]">
              {formatINR(totalAmount)}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: EMI Slider Configuration */}
            {step === "emi" && (
              <motion.div
                key="step-emi"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={transitionConfig}
                className="p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Zap className="w-5 h-5 text-[var(--color-accent)]" />
                  <h4 className="font-bold text-lg text-[var(--color-foreground)]">Design your EMI</h4>
                </div>

                <div className="mb-8 relative">
                  <div className="flex justify-between text-sm font-medium text-[var(--color-text-secondary)] mb-4">
                    <span>3 mo</span>
                    <span>12 mo</span>
                    <span>24 mo</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="24" 
                    step="3"
                    value={tenure}
                    onChange={(e) => setTenure(Number(e.target.value))}
                    className="w-full accent-[var(--color-accent)] cursor-pointer h-2 bg-[var(--color-border)] rounded-full appearance-none"
                  />
                  <style jsx>{`
                    input[type=range]::-webkit-slider-thumb {
                      appearance: none;
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      background: var(--color-on-primary);
                      border: 4px solid var(--color-accent);
                      cursor: pointer;
                      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    }
                  `}</style>
                </div>

                <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] p-4 mb-8 border border-[var(--color-border)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[var(--color-text-secondary)]">Monthly Installment</span>
                    <span className="text-2xl font-bold text-[var(--color-accent)]">₹{monthlyAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Duration</span>
                    <span className="font-medium text-[var(--color-foreground)]">{tenure} Months</span>
                  </div>
                </div>

                <button 
                  onClick={() => setStep("pay")}
                  className="w-full py-4 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold rounded-[var(--radius-md)] hover:bg-[var(--color-primary)]/90 transition-colors"
                >
                  Confirm Plan & Pay
                </button>
              </motion.div>
            )}

            {/* STEP 2: Frictionless Payment (Apple Pay style) */}
            {step === "pay" && (
              <motion.div
                key="step-pay"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={transitionConfig}
                className="p-6"
              >
                <h4 className="font-bold text-lg text-[var(--color-foreground)] mb-6 text-center">Authentication Required</h4>
                
                <div className="flex flex-col gap-3 mb-8">
                  <div className="p-4 rounded-[var(--radius-md)] border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[var(--color-accent)]/20 flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <div className="font-bold text-[var(--color-foreground)]">EMIVO Passkey</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">Face ID / Biometrics</div>
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  
                  <div className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] opacity-50 flex items-center gap-3 cursor-not-allowed">
                    <div className="w-8 h-8 rounded bg-[var(--color-surface-elevated)] flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </div>
                    <div>
                      <div className="font-bold text-[var(--color-foreground)]">Debit Card ending in 4242</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">Requires OTP</div>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-6 text-sm text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> Secure 256-bit encryption
                </div>

                <button 
                  onClick={handleProcessPayment}
                  className="w-full py-4 bg-[var(--color-foreground)] text-[var(--color-background)] font-bold rounded-[var(--radius-md)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-5 h-5" /> Double Click to Pay
                </button>
              </motion.div>
            )}

            {/* STEP 3: Processing */}
            {step === "processing" && (
              <motion.div
                key="step-processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 flex flex-col items-center justify-center"
              >
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full mb-6"
                />
                <h4 className="font-bold text-lg text-[var(--color-foreground)]">Processing Payment</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">Authenticating with your bank...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
