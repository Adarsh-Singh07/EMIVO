"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MapPin,
  CreditCard,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Tag,
  X,
  Plus,
  Loader2,
  AlertCircle,
  Truck,
  Package,
  ExternalLink,
} from "lucide-react";
import { useCart, displayShipping } from "@/components/site/CartProvider";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type Address, type OrderV2 } from "@/lib/store-api";
import { ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { inr, formatDate } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const IDEM_KEY_STORAGE = "elektrix_checkout_ik";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ik-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function loadCashfreeScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const w = window as any;
  if (w.Cashfree) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  label: "",
};

type AppliedCoupon = {
  code: string;
  discount: number; // paise
  message: string;
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CheckoutPage() {
  const { lines, subtotal, loading: cartLoading, reload: reloadCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  /* ---------------- Auth guard ---------------- */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/checkout");
    }
  }, [authLoading, user, router]);

  /* ---------------- Store config: payment availability ---------------- */
  const [onlinePaymentAvailable, setOnlinePaymentAvailable] = useState<boolean | null>(null);
  const [codFeePaise, setCodFeePaise] = useState<number>(0);
  useEffect(() => {
    storeApi.getStoreConfig().then((cfg) => {
      setOnlinePaymentAvailable(cfg.online_payment_available);
      setCodFeePaise(cfg.cod_fee_paise ?? 0);
      // If online payment not available, force COD
      if (!cfg.online_payment_available) setPaymentMethod("COD");
    }).catch(() => {
      setOnlinePaymentAvailable(false);
      setPaymentMethod("COD");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Stepper ---------------- */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* ---------------- Address step ---------------- */
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  /** Unsaved new address (used as shipping_address when not saving). */
  const [draftAddress, setDraftAddress] = useState<typeof form | null>(null);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError("");
    try {
      const data = await storeApi.listAddresses();
      const items = data.items || [];
      setAddresses(items);
      const def = items.find((a) => a.is_default) || items[0];
      if (def) setSelectedAddressId(def.id);
      else setShowNewForm(true);
    } catch (err) {
      setAddressesError(err instanceof Error ? err.message : "Could not load saved addresses");
      setShowNewForm(true);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadAddresses();
  }, [user, loadAddresses]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const formErrors = useMemo(() => {
    const errors: Partial<Record<keyof typeof form, string>> = {};
    if (!form.full_name.trim()) errors.full_name = "Required";
    if (!/^\d{10}$/.test(form.phone.trim())) errors.phone = "Enter a 10-digit mobile number";
    if (!form.line1.trim()) errors.line1 = "Required";
    if (!form.city.trim()) errors.city = "Required";
    if (!form.state.trim()) errors.state = "Required";
    if (!/^\d{6}$/.test(form.pincode.trim())) errors.pincode = "Enter a 6-digit PIN code";
    return errors;
  }, [form]);

  const formValid = Object.keys(formErrors).length === 0;

  const useNewAddress = async () => {
    if (!formValid) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (saveToAccount) {
      setSavingAddress(true);
      try {
        const created = await storeApi.createAddress({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          line1: form.line1.trim(),
          line2: form.line2.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          country: "IN",
          label: form.label.trim() || undefined,
          is_default: addresses.length === 0,
        });
        setAddresses((prev) => [...prev, created]);
        setSelectedAddressId(created.id);
        setDraftAddress(null);
        setShowNewForm(false);
        toast.success("Address saved");
        setStep(2);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save address");
      } finally {
        setSavingAddress(false);
      }
    } else {
      setDraftAddress({ ...form });
      setSelectedAddressId("");
      setShowNewForm(false);
      setStep(2);
    }
  };

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;
  const addressReady = Boolean(selectedAddress || draftAddress);

  /* ---------------- Offers step ---------------- */
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const result = await storeApi.validateCoupon(code, subtotal);
      if (result.is_valid) {
        setAppliedCoupon({
          code,
          discount: result.discount_amount || 0,
          message: result.message || "Coupon applied",
        });
        setCouponInput("");
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message || "This coupon is not valid for your cart");
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : "Could not validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  /* ---------------- Payment step ---------------- */
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("ONLINE");

  /* ---------------- Order placement ---------------- */
  const idemKeyRef = useRef<string>("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<OrderV2 | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ order: OrderV2; paymentId: string } | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const discount = appliedCoupon?.discount ?? 0;
  const shipping = displayShipping(subtotal, discount);
  const total = Math.max(0, subtotal - discount + shipping);

  const contactName = selectedAddress?.full_name || draftAddress?.full_name || user?.first_name || "";
  const contactPhone = selectedAddress?.phone || draftAddress?.phone || "";

  const buildPayload = () => {
    if (selectedAddress) {
      return { address_id: selectedAddress.id };
    }
    const a = draftAddress!;
    return {
      shipping_address: {
        full_name: a.full_name.trim(),
        phone: a.phone.trim(),
        line1: a.line1.trim(),
        line2: a.line2.trim() || undefined,
        city: a.city.trim(),
        state: a.state.trim(),
        pincode: a.pincode.trim(),
        country: "IN",
      },
    };
  };

  /** Opens Cashfree for an existing PENDING online order. */
  const startPayment = useCallback(
    async (order: OrderV2, paymentId: string, isRetry: boolean) => {
      const loaded = await loadCashfreeScript();
      if (!loaded) {
        setPendingPayment({ order, paymentId });
        toast.error("Online payment is temporarily unavailable. Please proceed with Cash on Delivery.");
        setPaymentMethod("COD");
        return;
      }
      try {
        const init = await storeApi.initiatePayment({
          order_id: order.id,
          idempotency_key: newIdempotencyKey(),
        });
        const co = init.checkout;
        
        const w = window as any;
        const cashfree = w.Cashfree({
          mode: co.environment === "sandbox" ? "sandbox" : "production"
        });

        cashfree.checkout({
          paymentSessionId: co.payment_session_id,
          redirectTarget: "_modal",
        }).then(async (result: any) => {
          if (result.error) {
            setPendingPayment({ order, paymentId });
            toast.error(result.error.message || "Payment was cancelled or failed");
            return;
          }
          if (result.redirect) {
             console.log("Payment will be redirected");
             return;
          }
          if (result.paymentDetails) {
            toast.success("Payment completed, verifying...");
            // Webhook takes a moment to process. Poll the order status up to 5 times.
            let fresh = order;
            for (let i = 0; i < 5; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              try {
                if (order.order_number) fresh = await storeApi.trackOrder(order.order_number);
                if (fresh.status !== "PENDING") break;
              } catch {}
            }
            setPendingPayment(null);
            setPlacedOrder(fresh);
            setAppliedCoupon(null);
            sessionStorage.removeItem(IDEM_KEY_STORAGE);
            reloadCart();
            if (fresh.status === "PENDING") {
               toast.info("Your payment is being verified. Please check your order history later.");
            } else {
               toast.success("Payment successful — order confirmed!");
            }
          }
        });
      } catch (err) {
        setPendingPayment({ order, paymentId });
        const apiErr = err as ApiError;
        if (apiErr instanceof ApiError && (apiErr.status === 502 || apiErr.status === 503) && apiErr.code === "PAYMENT_FAILED") {
          toast.error("Online payment is temporarily unavailable. Please proceed with Cash on Delivery.");
          setPaymentMethod("COD");
          setPlacing(false);
          return;
        }
        toast.error(err instanceof Error ? err.message : "Could not start payment");
      } finally {
        if (isRetry) setRetryingPayment(false);
      }
    },
    [contactName, contactPhone, user, reloadCart]
  );

  const placeOrder = async () => {
    if (!addressReady) {
      setStep(1);
      toast.error("Select or add a delivery address first");
      return;
    }
    if (lines.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setPlacing(true);
    setPlaceError("");

    // Fresh key per attempt; persisted so an ambiguous failure can be retried
    // safely (see readIdempotencyKey).
    const key = newIdempotencyKey();
    idemKeyRef.current = key;
    sessionStorage.setItem(IDEM_KEY_STORAGE, key);

    try {
      const response = await storeApi.checkout({
        ...buildPayload(),
        coupon_code: appliedCoupon?.code,
        payment_method: paymentMethod,
        idempotency_key: key,
      });

      if (response.payment_required && response.payment_id) {
        // Track the order immediately; while payment is open/completed we keep
        // pendingPayment set so the UI shows the retry state until the
        // verify-success call confirms.
        setPlacedOrder(response.order);
        setPendingPayment({ order: response.order, paymentId: response.payment_id });
        await startPayment(response.order, response.payment_id, false);
      } else {
        setPlacedOrder(response.order);
        setAppliedCoupon(null);
        sessionStorage.removeItem(IDEM_KEY_STORAGE);
        reloadCart();
        toast.success("Order placed successfully!");
      }
    } catch (err) {
      const apiErr = err as ApiError;
      let message = apiErr instanceof Error ? apiErr.message : "Failed to place order";
      if (apiErr?.code === "OUT_OF_STOCK") {
        message = `Out of stock: ${message}`;
      } else if (apiErr?.code?.startsWith("COUPON")) {
        message = `Coupon error: ${message}`;
        setAppliedCoupon(null);
      } else if (apiErr?.code === "CART_EMPTY") {
        message = "Your cart is empty.";
      } else if (apiErr instanceof ApiError && (apiErr.status === 502 || apiErr.status === 503) && apiErr.code === "PAYMENT_FAILED") {
        message = "Online payment is temporarily unavailable. Please proceed with Cash on Delivery.";
        setPaymentMethod("COD");
      }
      setPlaceError(message);
      toast.error(message);
      // The attempt definitively failed — the next click starts a new attempt.
      sessionStorage.removeItem(IDEM_KEY_STORAGE);
      idemKeyRef.current = "";
    } finally {
      setPlacing(false);
    }
  };

  /* ---------------- Render guards ---------------- */

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-8 bg-neutral-100 rounded w-48 mb-8 animate-pulse" />
        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          <div className="space-y-4">
            <div className="h-40 bg-neutral-100 rounded-3xl animate-pulse" />
            <div className="h-40 bg-neutral-100 rounded-3xl animate-pulse" />
          </div>
          <div className="h-96 bg-neutral-100 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (cartLoading && lines.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center text-neutral-500 animate-pulse">
        Loading checkout…
      </div>
    );
  }

  /* ---------------- Success screen ---------------- */
  if (placedOrder && !pendingPayment) {
    const o = placedOrder;
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-3xl font-semibold tracking-tight">
            {o.payment_method === "ONLINE" ? "Payment successful — order confirmed!" : "Order placed!"}
          </h1>
          <p className="text-neutral-500 mt-3">
            Thank you{contactName ? `, ${contactName.split(" ")[0]}` : ""}. Your order{" "}
            <span className="font-medium text-neutral-900">{o.order_number || o.id.slice(0, 8)}</span>{" "}
            has been received.
          </p>
        </div>

        <div className="mt-8 border border-neutral-200 rounded-3xl overflow-hidden">
          <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400">Order number</p>
              <p className="font-bold text-lg">{o.order_number || o.id.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-neutral-400">Placed on</p>
              <p className="font-medium text-sm">{o.created_at ? formatDate(o.created_at) : "—"}</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            {o.items.map((item, idx) => (
              <div key={`${item.product_id}-${idx}`} className="flex justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-xs text-neutral-500">{item.variant_name}</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Qty {item.quantity} × {inr(item.unit_price)}
                  </p>
                </div>
                <span className="font-semibold shrink-0">{inr(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="px-6 py-5 border-t border-neutral-100 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span className="font-medium text-neutral-800">{inr(o.subtotal)}</span>
            </div>
            {o.discount_total > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}</span>
                <span className="font-medium">−{inr(o.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-500">
              <span>Shipping</span>
              <span className="font-medium text-neutral-800">
                {o.shipping_total === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  inr(o.shipping_total)
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold">
              <span>Total paid via {o.payment_method === "COD" ? "cash on delivery" : "online payment"}</span>
              <span>{inr(o.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {o.order_number && (
            <Link
              href={`/order-tracking?orderId=${encodeURIComponent(o.order_number)}`}
              className="h-12 inline-flex items-center justify-center gap-2 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
            >
              <Truck className="w-4 h-4" /> Track Order
            </Link>
          )}
          <Link
            href="/shop"
            className="h-12 inline-flex items-center justify-center px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="h-12 inline-flex items-center justify-center px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
          >
            <Package className="w-4 h-4" /> My Orders
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- Pending payment (dismissed / failed) ---------------- */
  if (placedOrder && pendingPayment) {
    const o = pendingPayment.order;
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h1 className="text-3xl font-semibold tracking-tight">Payment not completed</h1>
          <p className="text-neutral-500 mt-3">
            Order <span className="font-medium text-neutral-900">{o.order_number || o.id.slice(0, 8)}</span>{" "}
            is saved with status <span className="font-medium">PENDING</span>. It will be confirmed
            once the payment succeeds.
          </p>
        </div>

        <div className="mt-8 border border-neutral-200 rounded-3xl p-6 text-sm space-y-2">
          <div className="flex justify-between text-neutral-500">
            <span>Items</span>
            <span className="font-medium text-neutral-800">
              {o.items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Amount due</span>
            <span className="font-semibold text-neutral-900">{inr(o.total)}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              setRetryingPayment(true);
              startPayment(pendingPayment.order, pendingPayment.paymentId, true);
            }}
            disabled={retryingPayment}
            className="h-12 inline-flex items-center justify-center gap-2 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
          >
            {retryingPayment ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Opening payment…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Retry Payment
              </>
            )}
          </button>
          {o.order_number && (
            <Link
              href={`/order-tracking?orderId=${encodeURIComponent(o.order_number)}`}
              className="h-12 inline-flex items-center justify-center gap-2 px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
            >
              <Truck className="w-4 h-4" /> View Order
            </Link>
          )}
          <Link
            href="/shop"
            className="h-12 inline-flex items-center justify-center px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- Empty cart ---------------- */
  if (lines.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Checkout</h1>
        <p className="text-neutral-500 mb-6">Your cart is empty — add something first.</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  /* ---------------- Checkout form ---------------- */
  const inputCls =
    "h-12 w-full border border-neutral-200 rounded-xl px-4 text-sm focus:outline-none focus:border-neutral-950";
  const inputErrorCls = (k: keyof typeof form) =>
    formErrors[k] ? "border-red-300 focus:border-red-500" : "";

  const STEPS = [
    { n: 1, label: "Address" },
    { n: 2, label: "Offers" },
    { n: 3, label: "Payment" },
  ] as const;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6">Checkout</h1>

      {/* Stepper */}
      <ol className="flex items-center gap-2 sm:gap-4 mb-8 text-sm overflow-x-auto no-scrollbar">
        {STEPS.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <li key={s.n} className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setStep(s.n)}
                className={`flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5 border transition-colors ${
                  active
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : done
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-neutral-200 text-neutral-500"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${
                    active
                      ? "bg-white text-neutral-950"
                      : done
                        ? "bg-green-600 text-white"
                        : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {done ? "✓" : s.n}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="hidden sm:block w-8 h-px bg-neutral-200" />}
            </li>
          );
        })}
      </ol>

      <div className="grid lg:grid-cols-[1fr_400px] gap-10 items-start">
        <div className="space-y-10 min-w-0">
          {/* ---------------- Step 1: Address ---------------- */}
          {step === 1 && (
            <section aria-label="Shipping address">
              <h2 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <MapPin className="w-5 h-5" /> Shipping Address
              </h2>

              {addressesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : addressesError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm mb-4">
                  {addressesError}
                  <button
                    onClick={loadAddresses}
                    className="ml-2 underline underline-offset-2 font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                addresses.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex gap-3 items-start p-4 rounded-2xl border cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? "border-neutral-950 ring-1 ring-neutral-950"
                            : "border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => {
                            setSelectedAddressId(addr.id);
                            setDraftAddress(null);
                            setShowNewForm(false);
                          }}
                          className="mt-1 accent-neutral-950"
                        />
                        <span className="text-sm">
                          <span className="font-semibold block">
                            {addr.full_name}{" "}
                            {addr.is_default && (
                              <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full align-middle">
                                Default
                              </span>
                            )}
                          </span>
                          <span className="text-neutral-500 block mt-0.5">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} —{" "}
                            {addr.pincode}
                          </span>
                          <span className="text-neutral-400 block">Phone: {addr.phone}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )
              )}

              {!showNewForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(true);
                    setSelectedAddressId("");
                    setDraftAddress(null);
                  }}
                  className="inline-flex items-center gap-2 h-11 px-5 border border-dashed border-neutral-300 rounded-full text-sm font-medium hover:border-neutral-500"
                >
                  <Plus className="w-4 h-4" /> Add a new address
                </button>
              ) : (
                <div className="border border-neutral-200 rounded-3xl p-5 sm:p-6 bg-neutral-50/40">
                  <h3 className="font-semibold mb-4">New address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-name">
                        Full name *
                      </label>
                      <input
                        id="addr-name"
                        value={form.full_name}
                        onChange={update("full_name")}
                        placeholder="Rahul Sharma"
                        className={`${inputCls} ${inputErrorCls("full_name")}`}
                      />
                      {formErrors.full_name && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.full_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-phone">
                        Phone *
                      </label>
                      <input
                        id="addr-phone"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                          }))
                        }
                        placeholder="9876543210"
                        inputMode="numeric"
                        className={`${inputCls} ${inputErrorCls("phone")}`}
                      />
                      {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-line1">
                        Address (flat, street, area) *
                      </label>
                      <input
                        id="addr-line1"
                        value={form.line1}
                        onChange={update("line1")}
                        placeholder="Flat / House no., Street, Area"
                        className={`${inputCls} ${inputErrorCls("line1")}`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-line2">
                        Landmark <span className="text-neutral-400">(optional)</span>
                      </label>
                      <input
                        id="addr-line2"
                        value={form.line2}
                        onChange={update("line2")}
                        placeholder="Near Metro Station"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-city">
                        City *
                      </label>
                      <input
                        id="addr-city"
                        value={form.city}
                        onChange={update("city")}
                        placeholder="Mumbai"
                        className={`${inputCls} ${inputErrorCls("city")}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-state">
                        State *
                      </label>
                      <input
                        id="addr-state"
                        value={form.state}
                        onChange={update("state")}
                        placeholder="Maharashtra"
                        className={`${inputCls} ${inputErrorCls("state")}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-pincode">
                        PIN code *
                      </label>
                      <input
                        id="addr-pincode"
                        value={form.pincode}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                          }))
                        }
                        placeholder="400001"
                        inputMode="numeric"
                        maxLength={6}
                        className={`${inputCls} ${inputErrorCls("pincode")}`}
                      />
                      {formErrors.pincode && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.pincode}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-label">
                        Label <span className="text-neutral-400">(optional)</span>
                      </label>
                      <input
                        id="addr-label"
                        value={form.label}
                        onChange={update("label")}
                        placeholder="Home, Work…"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="save-profile"
                      checked={saveToAccount}
                      onChange={(e) => setSaveToAccount(e.target.checked)}
                      className="rounded border-neutral-300 focus:ring-neutral-950 h-4 w-4 accent-neutral-950"
                    />
                    <label htmlFor="save-profile" className="text-xs text-neutral-600 font-medium cursor-pointer">
                      Save this address to my account
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button
                      type="button"
                      onClick={useNewAddress}
                      disabled={savingAddress}
                      className="h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      {savingAddress && <Loader2 className="w-4 h-4 animate-spin" />}
                      Use this address
                    </button>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewForm(false);
                          const def = addresses.find((a) => a.is_default) || addresses[0];
                          if (def) setSelectedAddressId(def.id);
                        }}
                        className="h-12 px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!showNewForm && addressReady && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-6 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
                >
                  Continue to offers
                </button>
              )}
            </section>
          )}

          {/* ---------------- Step 2: Offers ---------------- */}
          {step === 2 && (
            <section aria-label="Offers and coupons">
              <h2 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <Tag className="w-5 h-5" /> Offers & Coupons
              </h2>

              {appliedCoupon ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 text-green-700 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <Tag className="w-4 h-4" /> {appliedCoupon.code} applied
                    </p>
                    <p className="text-xs mt-1">{appliedCoupon.message}</p>
                    <p className="text-sm font-medium mt-1">You save {inr(appliedCoupon.discount)}</p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="p-2 hover:bg-green-100 rounded-full shrink-0"
                    aria-label="Remove coupon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor="coupon" className="text-sm font-medium block mb-2">
                    Have a coupon?
                  </label>
                  <div className="flex gap-2 max-w-md">
                    <input
                      id="coupon"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      placeholder="Enter code"
                      className="flex-1 h-12 border border-neutral-200 rounded-xl px-4 text-sm focus:outline-none focus:border-neutral-950 uppercase min-w-0"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="h-12 px-6 bg-neutral-950 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 inline-flex items-center gap-2 shrink-0"
                    >
                      {couponLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-sm text-red-600 mt-2 flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {couponError}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
                >
                  Continue to payment
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
                >
                  Back
                </button>
              </div>
            </section>
          )}

          {/* ---------------- Step 3: Payment ---------------- */}
          {step === 3 && (
            <section aria-label="Payment method">
              <h2 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <CreditCard className="w-5 h-5" /> Payment Method
              </h2>
              {/* Online payment unavailable banner */}
              {onlinePaymentAvailable === false && (
                <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Online payment is temporarily unavailable.</span>{" "}
                    Please continue with Cash on Delivery.
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                {onlinePaymentAvailable !== false && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ONLINE")}
                    aria-pressed={paymentMethod === "ONLINE"}
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition-all ${
                      paymentMethod === "ONLINE"
                        ? "border-neutral-950 bg-neutral-50"
                        : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-sm font-semibold">Pay online</span>
                    <span className="text-xs text-neutral-500">
                      UPI, cards, netbanking &amp; wallets via Cashfree
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("COD")}
                  aria-pressed={paymentMethod === "COD"}
                  className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition-all ${
                    paymentMethod === "COD"
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-400"
                  } ${onlinePaymentAvailable === false ? "col-span-full" : ""}`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-sm font-semibold">Pay on delivery (COD)</span>
                  <span className="text-xs text-neutral-500">
                    Pay in cash when your order arrives.
                    {codFeePaise > 0 && (
                      <> A COD handling fee of <strong>₹{codFeePaise / 100}</strong> will be added.</>
                    )}
                  </span>
                </button>
              </div>

              <p className="flex items-center gap-2 text-xs text-neutral-500 mt-4">
                <ShieldCheck className="w-3.5 h-3.5" /> Payments are processed securely — the final
                amount is computed by the store at order time.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-12 px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
                >
                  Back
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ---------------- Order summary ---------------- */}
        <aside className="border border-neutral-200 rounded-3xl p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

          <div className="space-y-3 max-h-56 overflow-y-auto mb-4">
            {lines.map((i) => (
              <div key={i.id} className="flex items-center gap-3">
                <span className="relative w-14 h-14 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                  {i.img ? (
                    <Image
                      src={i.img}
                      alt={i.product_name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-[9px] text-neutral-400 px-1 text-center leading-tight">
                      {i.product_name.slice(0, 16)}
                    </span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{i.product_name}</p>
                  <p className="text-xs text-neutral-500">
                    Qty {i.quantity} × {inr(i.unit_price)}
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">{inr(i.unit_price * i.quantity)}</span>
              </div>
            ))}
          </div>

          {appliedCoupon && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 rounded-full pl-3 pr-1.5 py-1.5 mb-4">
              <span className="text-sm font-medium inline-flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> {appliedCoupon.code}
              </span>
              <button
                onClick={removeCoupon}
                className="p-1 hover:bg-green-100 rounded-full"
                aria-label="Remove coupon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="font-medium">{inr(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <dt>Coupon discount</dt>
                <dd className="font-medium">−{inr(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Shipping</dt>
              <dd className="font-medium">
                {shipping === 0 ? <span className="text-green-600">FREE</span> : inr(shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{inr(total)}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-neutral-400 mt-2">
            Displayed totals are indicative — the store computes the final charged amount
            (taxes/fees included) at order time.
          </p>

          {placeError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{placeError}</span>
            </div>
          )}

          {step === 3 ? (
            <button
              onClick={placeOrder}
              disabled={placing || !addressReady}
              className="mt-5 w-full h-12 grid place-items-center bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {placing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Placing order…
                </span>
              ) : paymentMethod === "COD" ? (
                `Place Order · ${inr(total)}`
              ) : (
                `Pay ${inr(total)}`
              )}
            </button>
          ) : (
            <button
              onClick={() => setStep(step === 1 ? 2 : 3)}
              disabled={!addressReady && step === 1}
              className="mt-5 w-full h-12 grid place-items-center bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
            >
              {step === 1 ? "Continue to offers" : "Continue to payment"}
            </button>
          )}

          <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 mt-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure checkout · 10-day easy returns
          </p>
          {placedOrder === null && pendingPayment === null && (
            <p className="text-[11px] text-neutral-400 mt-2 text-center">
              Questions? <Link href="/contact" className="underline underline-offset-2 inline-flex items-center gap-1">Contact support <ExternalLink className="w-3 h-3" /></Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
