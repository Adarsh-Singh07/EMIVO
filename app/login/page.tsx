"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10) setStep("otp");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-surface-elevated)] p-4">
      <div className="max-w-md w-full bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[var(--color-border)] overflow-hidden">
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-2">EMIVO</h1>
            <p className="text-[var(--color-text-secondary)]">Sign in to your account</p>
          </div>

          {step === "phone" ? (
            <motion.form 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSendOtp}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Mobile Number</label>
                <div className="flex relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] font-medium">+91</span>
                  <input 
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] py-3 pl-12 pr-4 focus:outline-none focus:border-[var(--color-accent)] font-medium text-lg"
                    placeholder="99999 99999"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={phone.length !== 10}>
                Send OTP <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.form>
          ) : (
            <motion.form 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-4 text-center">
                  Enter OTP sent to +91 {phone}
                  <button type="button" onClick={() => setStep("phone")} className="text-[var(--color-accent)] ml-2 text-xs font-bold hover:underline">Edit</button>
                </label>
                <div className="flex justify-between gap-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      className="w-12 h-12 text-center text-xl font-bold bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  ))}
                </div>
              </div>
              <Button type="button" className="w-full h-12 text-base">
                Verify & Login
              </Button>
              <div className="text-center text-sm text-[var(--color-text-secondary)]">
                Didn't receive code? <button type="button" className="text-[var(--color-accent)] font-semibold hover:underline">Resend in 30s</button>
              </div>
            </motion.form>
          )}

          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <button className="w-full text-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] font-medium flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Login as Administrator
            </button>
          </div>
        </div>

        <div className="bg-[var(--color-surface-elevated)] p-4 flex justify-center gap-6 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium">
            <ShieldCheck className="w-4 h-4 text-green-600" /> 100% Secure
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium">
            <ShieldCheck className="w-4 h-4 text-green-600" /> RBI Compliant
          </div>
        </div>
      </div>
    </div>
  );
}
