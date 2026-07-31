"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";
import { MOCK_PRODUCTS } from "@/lib/data";
import { formatINR } from "@/lib/utils";
import { useState } from "react";

export function CheckoutDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState<"cart" | "address" | "payment" | "success">("cart");
  
  // Mock cart items
  const cartItems = [MOCK_PRODUCTS[0]];
  const total = cartItems.reduce((acc, item) => acc + item.basePrice, 0);
  const emi = Math.round(total / 12);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--color-background)]/80 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] flex items-center gap-2">
                <ShoppingBag className="w-6 h-6" />
                {step === "success" ? "Order Confirmed" : "Your Bag"}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[var(--color-background)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-secondary)]" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              <AnimatePresence mode="wait">
                {step === "cart" && (
                  <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="space-y-6">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]">
                          <div className="w-20 h-20 bg-[var(--color-surface)] rounded-xl overflow-hidden p-2 flex items-center justify-center">
                            <img src={item.gallery[0].url} alt={item.title} className="object-contain" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-[var(--color-secondary)] uppercase">{item.brand}</div>
                            <h3 className="font-semibold text-lg leading-tight mt-0.5">{item.title}</h3>
                            <div className="text-lg font-bold mt-2">{formatINR(item.basePrice * 100)}</div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="p-5 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-2xl flex justify-between items-center">
                        <div>
                          <div className="font-bold text-[var(--color-foreground)]">0% EMI Available</div>
                          <div className="text-sm text-[var(--color-secondary)]">Pay ₹{emi.toLocaleString('en-IN')} x 12 months</div>
                        </div>
                        <CreditCard className="w-6 h-6 text-[var(--color-accent)]" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "address" && (
                  <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <h3 className="text-lg font-semibold">Delivery Address</h3>
                    <div className="space-y-4">
                      <div className="p-4 border-2 border-[var(--color-foreground)] rounded-2xl relative">
                        <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5" /></div>
                        <div className="font-bold">John Doe</div>
                        <div className="text-sm text-[var(--color-secondary)] mt-1">123 Tech Park, Phase 1<br/>Bangalore, KA 560001<br/>+91 98765 43210</div>
                      </div>
                      <button className="w-full py-4 border border-dashed border-[var(--color-border)] rounded-2xl text-[var(--color-secondary)] font-medium hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                        + Add New Address
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === "payment" && (
                  <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                     <h3 className="text-lg font-semibold">Payment Method</h3>
                     <div className="space-y-3">
                       <label className="flex items-center gap-4 p-4 border border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-foreground)] transition-colors">
                         <input type="radio" name="payment" className="w-4 h-4 accent-black" defaultChecked />
                         <div>
                           <div className="font-semibold">EMIVO Instant EMI</div>
                           <div className="text-sm text-[var(--color-accent)] font-medium">₹{emi.toLocaleString('en-IN')}/mo • 0% Interest</div>
                         </div>
                       </label>
                       <label className="flex items-center gap-4 p-4 border border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-foreground)] transition-colors">
                         <input type="radio" name="payment" className="w-4 h-4 accent-black" />
                         <div className="font-semibold">Credit Card (HDFC)</div>
                       </label>
                       <label className="flex items-center gap-4 p-4 border border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-foreground)] transition-colors">
                         <input type="radio" name="payment" className="w-4 h-4 accent-black" />
                         <div className="font-semibold">UPI</div>
                       </label>
                     </div>
                  </motion.div>
                )}

                {step === "success" && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-bold">Order Placed</h3>
                    <p className="text-[var(--color-secondary)]">Your order #EM-847291 has been confirmed.<br/>It will be delivered by tomorrow, 9 PM.</p>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Footer Summary & Action */}
            {step !== "success" && (
              <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-background)]">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg text-[var(--color-secondary)]">Total</span>
                  <span className="text-2xl font-bold">{formatINR(total * 100)}</span>
                </div>
                
                <button 
                  onClick={() => {
                    if (step === "cart") setStep("address");
                    else if (step === "address") setStep("payment");
                    else if (step === "payment") setStep("success");
                  }}
                  className="w-full h-14 bg-[var(--color-foreground)] text-[var(--color-background)] rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[var(--shadow-lg)]"
                >
                  {step === "cart" ? "Proceed to Checkout" : step === "payment" ? "Place Order" : "Continue"} 
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
