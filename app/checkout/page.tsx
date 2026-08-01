"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  Home,
  IndianRupee,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  User,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LedgerFigure } from "@/components/ui/ledger-figure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store/cart";

const SHIPPING_PAISA = 0;
const PROCESSING_FEE_PAISA = 9900;
const TENURES = [3, 6, 9, 12, 18, 24] as const;
const transitionConfig = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };

type Step = "details" | "emi" | "pay" | "processing";

interface CheckoutFieldProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function CheckoutField({ icon, label, children }: CheckoutFieldProps) {
  return (
    <label className="space-y-2">
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, getEMISubtotal, clearCart } = useCartStore();
  const [step, setStep] = useState<Step>("details");
  const [tenure, setTenure] = useState<(typeof TENURES)[number]>(12);

  const subtotal = getSubtotal();
  const cartEmiSubtotal = getEMISubtotal();
  const payableToday = PROCESSING_FEE_PAISA;
  const orderTotal = subtotal + SHIPPING_PAISA;
  const monthlyAmount = useMemo(() => Math.round(orderTotal / tenure), [orderTotal, tenure]);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const leadItem = items[0];

  const handleProcessPayment = () => {
    setStep("processing");
    window.sessionStorage.setItem(
      "emivo-last-order",
      JSON.stringify({
        totalItems,
        orderTotal,
        monthlyAmount,
        tenure,
        leadTitle: leadItem?.product.title ?? "your EMIVO order",
      })
    );

    setTimeout(() => {
      clearCart();
      router.push("/checkout/success");
    }, 2200);
  };

  if (items.length === 0 && step !== "processing") {
    return (
      <main className="min-h-screen bg-[var(--color-background)] px-4 py-10 md:py-16">
        <div className="container-emivo max-w-xl">
          <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to products
          </Link>
          <div className="mt-10 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-secondary)]">
              <PackageCheck className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-foreground)]">Your checkout is empty</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-secondary)]">
              Add a Fynode-powered audio product to continue with EMIVO instant EMI checkout.
            </p>
            <Button asChild variant="accent" size="lg" className="mt-8 rounded-full">
              <Link href="/products">Explore products</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[var(--color-accent)]/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-18rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[var(--color-primary)]/10 blur-[120px]" />

      <div className="container-emivo relative z-10 py-8 md:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/products" className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-colors hover:bg-[var(--color-surface-elevated)]">
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
          <div className="hidden items-center gap-2 rounded-full bg-[var(--color-surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)] md:flex">
            <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" /> Secure EMI checkout
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge variant="emi" className="mb-4">Instant approval</Badge>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] md:text-5xl">
                    Checkout built for monthly ownership.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-secondary)] md:text-base">
                    Confirm delivery, design your EMI plan, and complete a Fynode-inspired express payment experience.
                  </p>
                </div>
                <div className="grid min-w-36 place-items-center rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Starts at</span>
                  <LedgerFigure paisa={cartEmiSubtotal || monthlyAmount} size="lg" tone="accent" suffix="/mo" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ["details", "Delivery"],
                ["emi", "EMI plan"],
                ["pay", "Payment"],
              ].map(([key, label], index) => {
                const activeIndex = ["details", "emi", "pay", "processing"].indexOf(step);
                const currentIndex = ["details", "emi", "pay"].indexOf(key);
                const isDone = activeIndex > currentIndex;
                const isActive = step === key;
                return (
                  <div
                    key={key}
                    className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-colors ${
                      isActive || isDone
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 text-xs">{isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>

            <motion.div layout className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)]">
              <AnimatePresence mode="wait">
                {step === "details" && (
                  <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={transitionConfig} className="p-5 md:p-7">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Delivery details</h2>
                        <p className="text-sm text-[var(--color-secondary)]">Pre-filled demo information for a fast client walkthrough.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <CheckoutField icon={<User className="h-3.5 w-3.5" />} label="Full name">
                        <Input defaultValue="Dheeraj Kumar" autoComplete="name" />
                      </CheckoutField>
                      <CheckoutField icon={<Smartphone className="h-3.5 w-3.5" />} label="Mobile number">
                        <Input defaultValue="98765 43210" inputMode="tel" autoComplete="tel" />
                      </CheckoutField>
                      <CheckoutField icon={<Home className="h-3.5 w-3.5" />} label="Address" >
                        <Input defaultValue="42, Residency Road" autoComplete="street-address" />
                      </CheckoutField>
                      <CheckoutField icon={<MapPin className="h-3.5 w-3.5" />} label="PIN code">
                        <Input defaultValue="560001" inputMode="numeric" autoComplete="postal-code" />
                      </CheckoutField>
                    </div>

                    <div className="mt-6 rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 p-4">
                      <div className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />
                        <div>
                          <div className="font-bold text-[var(--color-foreground)]">Free priority delivery unlocked</div>
                          <p className="mt-1 text-sm text-[var(--color-secondary)]">Ships from an EMIVO partner retailer with insured delivery and doorstep verification.</p>
                        </div>
                      </div>
                    </div>

                    <Button onClick={() => setStep("emi")} variant="accent" size="lg" className="mt-7 w-full rounded-full font-bold">
                      Continue to EMI design <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {step === "emi" && (
                  <motion.div key="emi" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={transitionConfig} className="p-5 md:p-7">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Design your EMI</h2>
                        <p className="text-sm text-[var(--color-secondary)]">No-cost demo plan with transparent monthly ownership.</p>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-background)] p-4 md:p-5">
                      <div className="flex items-end justify-between gap-4 border-b border-dashed border-[var(--color-border)] pb-5">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Monthly installment</span>
                          <div className="mt-2"><LedgerFigure paisa={monthlyAmount} size="2xl" tone="accent" suffix="/mo" /></div>
                        </div>
                        <Badge variant="emi">0% EMI</Badge>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 md:grid-cols-6">
                        {TENURES.map((months) => (
                          <button
                            key={months}
                            onClick={() => setTenure(months)}
                            className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-all ${
                              tenure === months
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
                            }`}
                          >
                            {months} mo
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-3 rounded-2xl bg-[var(--color-surface)] p-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-secondary)]">Product total</span>
                          <LedgerFigure paisa={orderTotal} size="sm" noLine />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-secondary)]">Processing today</span>
                          <LedgerFigure paisa={payableToday} size="sm" noLine tone="navy" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-secondary)]">Interest</span>
                          <span className="font-bold text-[var(--color-success)]">No cost</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => setStep("details")} variant="outline" size="lg" className="rounded-full">Back</Button>
                      <Button onClick={() => setStep("pay")} variant="accent" size="lg" className="flex-1 rounded-full font-bold">
                        Approve plan <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === "pay" && (
                  <motion.div key="pay" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={transitionConfig} className="p-5 md:p-7">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Secure approval</h2>
                        <p className="text-sm text-[var(--color-secondary)]">Demo passkey payment for a frictionless checkout moment.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button className="flex w-full items-center justify-between rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-4 text-left">
                        <span className="flex items-center gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                            <Smartphone className="h-5 w-5" />
                          </span>
                          <span>
                            <span className="block font-bold">EMIVO Passkey</span>
                            <span className="block text-xs text-[var(--color-secondary)]">Biometric verification + UPI Autopay mandate</span>
                          </span>
                        </span>
                        <Check className="h-5 w-5 text-[var(--color-accent)]" />
                      </button>

                      <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 opacity-60">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-surface)] text-[var(--color-secondary)]">
                          <CreditCard className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-bold">Debit card ending in 4242</div>
                          <div className="text-xs text-[var(--color-secondary)]">OTP fallback available after demo</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-secondary)]"><IndianRupee className="h-4 w-4" /> Pay today</span>
                        <LedgerFigure paisa={payableToday} size="lg" tone="navy" />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--color-secondary)]">Includes refundable EMI setup and first-month mandate verification. Product amount remains split across {tenure} months.</p>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => setStep("emi")} variant="outline" size="lg" className="rounded-full">Back</Button>
                      <Button onClick={handleProcessPayment} variant="accent" size="lg" className="flex-1 rounded-full font-bold">
                        Double click to approve
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === "processing" && (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid min-h-[420px] place-items-center p-8 text-center">
                    <div>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="mx-auto mb-6 h-14 w-14 rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-accent)]" />
                      <h2 className="text-2xl font-bold tracking-tight">Approving your EMI</h2>
                      <p className="mt-2 text-sm text-[var(--color-secondary)]">Creating mandate, confirming stock, and locking retailer fulfillment.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </section>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)]">
              <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold tracking-tight">Order summary</h2>
                    <p className="text-sm text-[var(--color-secondary)]">{totalItems} item{totalItems === 1 ? "" : "s"} in your cart</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
              </div>

              <div className="max-h-[360px] space-y-3 overflow-y-auto p-5 scrollbar-hide">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                    <Link href={`/product/${item.product.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white p-2">
                      <Image src={item.product.gallery[0]?.url || "/placeholder.png"} alt={item.product.title} fill sizes="80px" className="object-contain p-2" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-secondary)]">{item.product.brand}</div>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug">{item.product.title}</h3>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-[var(--color-secondary)]">Qty {item.quantity}</span>
                        <LedgerFigure paisa={item.product.basePrice * item.quantity} size="sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-[var(--color-border)] p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-secondary)]">Subtotal</span>
                  <LedgerFigure paisa={subtotal} size="sm" noLine />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-secondary)]">Shipping</span>
                  <span className="font-bold text-[var(--color-success)]">FREE</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-[var(--color-border)] pt-3">
                  <span className="font-bold">Total financed</span>
                  <LedgerFigure paisa={orderTotal} size="lg" />
                </div>
                <div className="rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">EMI estimate</span>
                    <LedgerFigure paisa={monthlyAmount} size="md" tone="accent" suffix="/mo" />
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-secondary)]">Powered by EMIVO credit routing across partner lenders.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
