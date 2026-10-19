"use client";

import { explainApiError } from "@/lib/errors";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutErrorListener() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("error") === "payment_cancelled") {
      toast.error("Payment was cancelled or failed. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);
  return null;
}
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
  Navigation,
  RotateCcw,
} from "lucide-react";
import { useCart } from "@/components/site/CartProvider";
import BankOfferHint from "@/components/site/BankOfferHint";
import { useStoreShippingConfig, computeShipping } from "@/lib/store-config";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type Address, type OrderV2 } from "@/lib/store-api";
import { ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { inr, formatDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { isSafeRedirectUrl, openPaymentGateway } from "@/lib/safe-redirect";
import { loadEasebuzzSdk, preconnectEasebuzz } from "@/lib/easebuzz-sdk";
import { getRememberedPincode, rememberPincode } from "@/lib/pincode-memory";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const IDEM_KEY_STORAGE = "elektrix_checkout_ik";
// Hands a just-created payment session to the /pay page so the gateway
// lightbox opens without an extra initiate round-trip after the redirect.
const PAY_SESSION_KEY = "elektrix_pay_session";

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
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const cart = useCart();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ---------------- Buy Now mode ----------------
   * /checkout?buyNow=<productId>&variant=<variantId> checks out ONLY that
   * product (single-item order, explicit `items` payload). The buyer's saved
   * cart is NOT read or cleared — "add to cart → checkout" still carries
   * every cart item. */
  const buyNowId = searchParams.get("buyNow") || "";
  const buyNowVariant = searchParams.get("variant") || "";
  const [buyNowItem, setBuyNowItem] = useState<import("@/components/site/CartProvider").CartLine | null>(null);
  const [buyNowLoading, setBuyNowLoading] = useState(!!buyNowId);
  useEffect(() => {
    if (!buyNowId) return;
    let cancelled = false;
    setBuyNowLoading(true);
    (async () => {
      try {
        const p = await storeApi.getProduct(buyNowId);
        if (cancelled) return;
        setBuyNowItem({
          id: `buynow-${buyNowId}`,
          product_id: p.id,
          variant_id: buyNowVariant || null,
          quantity: 1,
          unit_price: p.effective_price,
          subtotal: p.effective_price,
          product_name: p.name,
          variant_name: null,
          stock_available: p.stock?.available ?? null,
          img: p.images?.[0],
        });
      } catch {
        if (!cancelled) toast.error("Could not load this product — please try again.");
      } finally {
        if (!cancelled) setBuyNowLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buyNowId, buyNowVariant]);

  const isBuyNow = !!buyNowId;
  // WS4: cart selection — /checkout?sel=<cart-line-ids> checks out ONLY the
  // selected lines; the rest stay in the cart. Unknown ids fall back to the
  // whole cart rather than stranding the buyer on an empty checkout.
  const selParam = searchParams.get("sel") || "";
  const selIds = selParam.split(",").map((s) => s.trim()).filter(Boolean);
  const cartSelLines =
    selIds.length > 0 ? cart.lines.filter((l) => selIds.includes(l.id)) : cart.lines;
  const effectiveCartLines =
    selIds.length > 0 && cartSelLines.length === 0 ? cart.lines : cartSelLines;
  const hasSelection = selIds.length > 0 && cartSelLines.length > 0;

  const lines = isBuyNow && buyNowItem ? [buyNowItem] : effectiveCartLines;
  const subtotal =
    isBuyNow && buyNowItem
      ? buyNowItem.subtotal
      : hasSelection
        ? effectiveCartLines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
        : cart.subtotal;
  // WS4: Buy Now is a SINGLE page — address + offers + payment stacked, one
  // sticky CTA. The cart flow keeps the 3-step in-page stepper.
  const singlePage = isBuyNow;
  const cartLoading = isBuyNow ? buyNowLoading : cart.loading;
  const reloadCart = cart.reload;

  // Surfaces the ?error=payment_cancelled toast on return from the gateway.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("error") === "payment_cancelled") {
      toast.error("Payment was cancelled or failed. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // begin_checkout — buyer reached the checkout step with a non-empty cart.
  useEffect(() => {
    if (lines.length > 0) {
      track("begin_checkout", { currency: "INR", value: subtotal / 100, items: lines.length });
    }
  }, [lines.length, subtotal]);


  /* ---------------- Auth guard ---------------- */
  useEffect(() => {
    if (!authLoading && !user) {
      // Carry the current query through the login round-trip so a
      // /checkout?buyNow=<id> (Buy Now) returns to the same single-item flow.
      const full = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/checkout";
      router.replace(`/login?next=${encodeURIComponent(full)}`);
    }
  }, [authLoading, user, router]);

  /* ---------------- Store config: payment availability ---------------- */
  const [onlinePaymentAvailable, setOnlinePaymentAvailable] = useState<boolean | null>(null);
  const [codEnabled, setCodEnabled] = useState<boolean | null>(null);
  const [codFeePaise, setCodFeePaise] = useState<number>(0);
  useEffect(() => {
    storeApi.getStoreConfig().then((cfg) => {
      setOnlinePaymentAvailable(cfg.online_payment_available);
      // OWNER DECISION 2026-10-20: COD is NOT offered. Force the COD card to
      // "unavailable" regardless of the admin toggle (the live admin Settings
      // toggle must also be OFF). Re-enable later only via admin Settings —
      // then remove this override. The code path below stays intact.
      setCodEnabled(false);
      setCodFeePaise(cfg.cod_fee_paise ?? 0);
      // Follow the store's effective default gateway (admin-selected in
      // Settings, env fallback resolved server-side). There is no per-buyer
      // chooser — this MUST be the same value the admin panel displays.
      const dg = (cfg.default_gateway || "").toUpperCase();
      if (dg === "CASHFREE" || dg === "EASEBUZZ") {
        setGateway(dg);
      }
      
      // COD is forced off (owner decision 2026-10-20): always default to
      // online payment. The COD branch below is unreachable while forced.
      if (cfg.online_payment_available) {
        setPaymentMethod("ONLINE");
      }
    }).catch(() => {
      // Config unreachable: never invent COD availability. Default to
      // online payment and keep COD hidden unless the store config
      // explicitly enables it.
      setCodEnabled(false);
      setPaymentMethod("ONLINE");
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
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [locationHint, setLocationHint] = useState("");
  /** Unsaved new address (used as shipping_address when not saving). */
  const [draftAddress, setDraftAddress] = useState<typeof form | null>(null);

  const handlePincodeChange = async (val: string) => {
    const pin = val.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: pin }));
    if (pin.length === 6) {
      rememberPincode(pin);
      setPincodeLoading(true);
      try {
        const est = await storeApi.getShippingEstimate(pin);
        if (est.city || est.state) {
          setForm((f) => ({
            ...f,
            city: f.city || est.city || "",
            state: f.state || est.state || "",
          }));
          const place = est.city ? `${est.city}, ${est.state || ""}` : (est.state || "");
          const del = est.formatted_delivery_date ? ` • Delivery by ${est.formatted_delivery_date}` : "";
          setLocationHint(`📍 ${place}${del}`);
        }
      } catch {
        // ignore
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setLocationHint("");
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const geo = await storeApi.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (geo.success && geo.pincode) {
            setForm((f) => ({
              ...f,
              pincode: geo.pincode || f.pincode,
              city: geo.city || f.city,
              state: geo.state || f.state,
            }));
            const place = geo.city ? `${geo.city}, ` : "";
            toast.success(`Location detected: ${place}${geo.pincode}`);
            if (geo.estimate?.formatted_delivery_date) {
              setLocationHint(`📍 ${place}${geo.state} • Delivery by ${geo.estimate.formatted_delivery_date}`);
            }
          } else {
            toast.error(geo.message || "Could not detect PIN code from current coordinates");
          }
        } catch {
          toast.error("Failed to reverse geocode location");
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) {
          toast.error("Location permission denied. Please enter PIN code manually.");
        } else {
          toast.error("Could not fetch location. Please enter PIN code manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

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

  // Pre-fill the PIN field from a previously-remembered delivery PIN (set in the
  // site header, a product page, or a past checkout) so the buyer's location is
  // remembered across visits. Skipped once a saved address drives the form.
  useEffect(() => {
    if (form.pincode) return;
    const remembered = getRememberedPincode();
    if (remembered) {
      setForm((f) => ({ ...f, pincode: f.pincode || remembered }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        rememberPincode(form.pincode);
        setAddresses((prev) => [...prev, created]);
        setSelectedAddressId(created.id);
        setDraftAddress(null);
        setShowNewForm(false);
        toast.success("Address saved");
        setStep(2);
      } catch (err) {
        toast.error(explainApiError(err).summary);
      } finally {
        setSavingAddress(false);
      }
    } else {
      rememberPincode(form.pincode);
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
      setCouponError(explainApiError(err).summary);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
    // Also drop the cart-carried coupon so it doesn't re-apply on reload.
    try {
      sessionStorage.removeItem("elektrix_applied_coupon");
    } catch {
      /* ignore */
    }
  };

  // Coupon carried over from the cart (WS3): validate it fresh server-side
  // once the cart subtotal is known. Runs once per mount.
  const cartCouponChecked = useRef(false);
  useEffect(() => {
    if (cartCouponChecked.current || appliedCoupon || isBuyNow) return;
    if (cartLoading || subtotal <= 0) return;
    cartCouponChecked.current = true;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("elektrix_applied_coupon");
    } catch {
      return;
    }
    if (!raw) return;
    let parsed: { code?: string } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!parsed?.code) return;
    const code = parsed.code.toUpperCase();
    storeApi
      .validateCoupon(code, subtotal)
      .then((result) => {
        if (result.is_valid) {
          setAppliedCoupon({
            code,
            discount: result.discount_amount || 0,
            message: result.message || "Coupon applied",
          });
          toast.success(`${code} from your cart applied`);
        } else {
          try {
            sessionStorage.removeItem("elektrix_applied_coupon");
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* leave the coupon off — buyer can retry manually */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLoading, subtotal]);

  /* ---------------- Payment step ---------------- */
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("ONLINE");
  /** Gateway the buyer pays through — the store's default (backend-resolved).
   *  Initial matches the backend's Cashfree-preferred fallback so checkout and
   *  the admin panel always agree, even before /store/config loads. */
  const [gateway, setGateway] = useState<"EASEBUZZ" | "CASHFREE">("CASHFREE");

  // Warm the payment gateway: preconnect + preload the SDK of the gateway
  // the buyer currently has selected, so the lightbox opens fast. Swapping
  // the selection preloads the other SDK too (both stay cached).
  useEffect(() => {
    if (paymentMethod !== "ONLINE") return;
    if (gateway === "CASHFREE") loadCashfreeScript();
    else loadEasebuzzSdk();
  }, [paymentMethod, gateway]);

  /* ---------------- Order placement ---------------- */
  const idemKeyRef = useRef<string>("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderV2 | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ order: OrderV2; paymentId: string } | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const discount = appliedCoupon?.discount ?? 0;
  const shipCfg = useStoreShippingConfig();
  const shipping = computeShipping(subtotal, discount, shipCfg);
  const belowMinOrder = shipCfg.minOrderPaise > 0 && subtotal < shipCfg.minOrderPaise;
  const totalBeforeFee = Math.max(0, subtotal - discount + shipping);
  const finalCodFee = paymentMethod === "COD" ? codFeePaise : 0;
  const total = totalBeforeFee + finalCodFee;

  const contactName = selectedAddress?.full_name || draftAddress?.full_name || user?.first_name || "";
  const contactPhone = selectedAddress?.phone || draftAddress?.phone || "";

  const buildPayload = () => {
    // Base: the delivery address (always required by the server).
    const base = selectedAddress
      ? { address_id: selectedAddress.id }
      : {
          shipping_address: {
            full_name: draftAddress!.full_name.trim(),
            phone: draftAddress!.phone.trim(),
            line1: draftAddress!.line1.trim(),
            line2: draftAddress!.line2.trim() || undefined,
            city: draftAddress!.city.trim(),
            state: draftAddress!.state.trim(),
            pincode: draftAddress!.pincode.trim(),
            country: "IN",
          },
        };
    // Buy Now: send an explicit single-item payload so ONLY this product is
    // ordered — the buyer's saved cart is left intact. Without `items`, the
    // server resolves the whole cart (the normal "add to cart → checkout").
    if (isBuyNow && buyNowItem) {
      return {
        ...base,
        items: [{ product_id: buyNowItem.product_id, variant_id: buyNowVariant || undefined, quantity: 1 }],
      };
    }
    // WS4: selected-subset checkout — explicit items so ONLY the selected
    // lines are ordered; the buyer's saved cart keeps the rest.
    if (hasSelection) {
      return {
        ...base,
        items: effectiveCartLines.map((l) => ({
          product_id: l.product_id,
          variant_id: l.variant_id ?? undefined,
          quantity: l.quantity,
        })),
      };
    }
    return base;
  };

  /** Opens Cashfree for an existing PENDING online order. */
  const startPayment = useCallback(
    async (order: OrderV2, paymentId: string, isRetry: boolean) => {
      try {
        const init = await storeApi.initiatePayment({
          order_id: order.id,
          idempotency_key: newIdempotencyKey(),
          provider: gateway,
        });
        const co = init.checkout;

        if (co.provider === "easebuzz") {
          // EaseBuzz integration: directly redirect the browser to the hosted checkout page
          if (co.checkout_url) {
            if (!isSafeRedirectUrl(co.checkout_url)) {
              throw new Error("Untrusted payment redirect URL — refusing to navigate");
            }
            setRedirecting(true);
            openPaymentGateway(co.checkout_url);
            await new Promise(() => {}); // block to prevent UI flicker while redirecting
            return;
          }
          throw new Error("Missing checkout_url for EaseBuzz payment");
        } 
        
        // Fallback to Cashfree logic (if still configured)
        const loaded = await loadCashfreeScript();
        if (!loaded) {
          setPendingPayment({ order, paymentId });
          toast.error("Online payment is temporarily unavailable. Please try again in a few minutes.");
          return;
        }

        const w = window as any;
        // Cashfree v3 SDK: Cashfree.load() returns a promise with the client.
        // _modal keeps the checkout on this page (inline lightbox).
        const CashfreeCtor = w.Cashfree?.load
          ? await w.Cashfree.load({ mode: co.environment === "sandbox" ? "sandbox" : "production" })
          : w.Cashfree({ mode: co.environment === "sandbox" ? "sandbox" : "production" });
        const cashfree = CashfreeCtor;

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
               track("purchase", {
                 transaction_id: fresh.order_number || fresh.id,
                 currency: "INR",
                 value: total / 100,
               });
            }
          }
        });
      } catch (err) {
        // Retry-window errors: send the buyer to the order page where
        // reorder lives — retrying here would just fail again.
        if (err instanceof ApiError && (err.code === "STOCK_SOLD_OUT" || err.code === "PAYMENT_WINDOW_EXPIRED")) {
          toast.error(err.message);
          setPlacing(false);
          router.push(`/order-tracking?orderId=${encodeURIComponent(order.order_number || order.id)}`);
          return;
        }
        // Keep the PENDING order + paymentId so the retry screen reuses the
        // SAME order. Never funnel the user back to the form: clicking Pay
        // again there would create a second order (new idempotency key) and
        // orphan the first PENDING order with its reserved stock.
        setPendingPayment({ order, paymentId });
        setPlacedOrder(order);
        toast.error("Online payment is facing issues. You can retry payment from here.");
        setPlacing(false);
      } finally {
        if (isRetry) setRetryingPayment(false);
      }
    },
    [contactName, contactPhone, user, reloadCart, gateway]
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

    // if (paymentMethod === "ONLINE") {
    //   toast.error("Online payments are unavailable. Please try Cash on Delivery.");
    //   setPaymentMethod("COD");
    //   setPlacing(false);
    //   return;
    // }

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

      if (response.payment_required) {
        // Hand off to the dedicated /pay page IMMEDIATELY: the buyer leaves
        // the checkout the moment they click Pay. That page owns the whole
        // lifecycle — gateway handoff, live status polling, retry/reorder.
        sessionStorage.removeItem(IDEM_KEY_STORAGE);
        reloadCart();
        // Kick off the gateway session NOW, in parallel with the redirect:
        // the /pay page picks it up from sessionStorage and opens the
        // lightbox without another initiate round-trip.
        const orderId = response.order.id;
        (async () => {
          try {
            const init = await storeApi.initiatePayment({
              order_id: orderId,
              idempotency_key: crypto.randomUUID(),
              provider: gateway,
            });
            // Stash whichever gateway was chosen so the /pay page can open
            // its lightbox with zero extra round-trips.
            const co = init.checkout;
            const hasSession =
              (co?.provider === "easebuzz" && !!(co as any).access_key) ||
              (co?.provider === "cashfree" && !!(co as any).payment_session_id);
            if (hasSession) {
              sessionStorage.setItem(PAY_SESSION_KEY, JSON.stringify({
                orderId,
                paymentId: init.payment?.id || null,
                checkout: co,
              }));
            }
          } catch {
            // Non-fatal: the /pay page falls back to initiating itself.
          }
        })();
        router.push(`/pay/${encodeURIComponent(orderId)}?placed=1`);
        setPlacing(false);
        return;
      } else {
        setPlacedOrder(response.order);
        setAppliedCoupon(null);
        try {
          sessionStorage.removeItem("elektrix_applied_coupon");
        } catch {
          /* ignore */
        }
        sessionStorage.removeItem(IDEM_KEY_STORAGE);
        reloadCart();
        toast.success("Order placed successfully!");
        track("purchase", {
          transaction_id: response.order.order_number || response.order.id,
          currency: "INR",
          value: total / 100,
        });
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
        message = "Online payment is temporarily unavailable. Please try again in a few minutes.";
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
  if (redirecting) {
    return (
      <div className="fixed inset-0 z-50 bg-white/95 grid place-items-center" role="status" aria-live="polite">
        <div className="text-center px-6">
          <Loader2 className="w-10 h-10 animate-spin text-neutral-900 mx-auto" />
          <p className="mt-5 text-lg font-semibold tracking-tight">Contacting secure payment gateway…</p>
          <p className="mt-1 text-sm text-neutral-500">This can take a few seconds. Don&apos;t close this page.</p>
        </div>
      </div>
    );
  }

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
              router.push(`/pay/${encodeURIComponent(pendingPayment.order.id)}`);
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
    <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 ${singlePage ? "pb-36 lg:pb-8" : ""}`}>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6">Checkout</h1>
      {hasSelection && (
        <p className="text-sm text-neutral-500 -mt-4 mb-6">
          Checking out {lines.length} selected {lines.length === 1 ? "item" : "items"} — the rest stay in your cart.
        </p>
      )}

      {/* Stepper — hidden on the single-page Buy Now flow (WS4) */}
      {!singlePage && (
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
      )}

      <div className="grid lg:grid-cols-[1fr_400px] gap-10 items-start">
        <div className="space-y-10 min-w-0">
          {/* ---------------- Step 1: Address ---------------- */}
          {(singlePage || step === 1) && (
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">New address</h3>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50 transition-colors"
                    >
                      {detectingLocation ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Detecting location…</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Use Current Location</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1.5" htmlFor="addr-name">
                        Full name *
                      </label>
                      <input
                        id="addr-name"
                        value={form.full_name}
                        onChange={update("full_name")}
                        placeholder="Full Name"
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
                        placeholder="1234567890"
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
                      <div className="relative">
                        <input
                          id="addr-pincode"
                          value={form.pincode}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          placeholder="400001"
                          inputMode="numeric"
                          maxLength={6}
                          className={`${inputCls} ${inputErrorCls("pincode")}`}
                        />
                        {pincodeLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      {locationHint && (
                        <p className="text-xs text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                          {locationHint}
                        </p>
                      )}
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

              {!singlePage && !showNewForm && addressReady && (
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
          {(singlePage || step === 2) && (
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

              {/* Bank card offers relevant to the current cart */}
              <BankOfferHint productIds={lines.map((l) => l.product_id)} />

              {!singlePage && (
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
              )}
            </section>
          )}

          {/* ---------------- Step 3: Payment ---------------- */}
          {(singlePage || step === 3) && (
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
                    Please try again in a few minutes, or contact support if the problem continues.
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onlinePaymentAvailable !== false ? setPaymentMethod("ONLINE") : toast.error("Online payments are not available right now. Please try others.")}
                  disabled={onlinePaymentAvailable === false}
                  aria-pressed={paymentMethod === "ONLINE"}
                  className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition-all ${
                    paymentMethod === "ONLINE"
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-400"
                  } ${onlinePaymentAvailable === false ? "opacity-60 cursor-not-allowed border-neutral-200 hover:border-neutral-200 grayscale bg-neutral-50/50" : ""}`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-semibold">Pay online</span>
                  <span className="text-xs text-neutral-500">
                    {onlinePaymentAvailable === false ? "Not available right now" : "UPI, cards, netbanking & wallets"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => codEnabled !== false ? setPaymentMethod("COD") : toast.error("COD is not available right now. Please try others.")}
                  disabled={codEnabled === false}
                  aria-pressed={paymentMethod === "COD"}
                  className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition-all ${
                    paymentMethod === "COD"
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-400"
                  } ${codEnabled === false ? "opacity-60 cursor-not-allowed border-neutral-200 hover:border-neutral-200 grayscale bg-neutral-50/50" : ""}`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-sm font-semibold">Pay on delivery (COD)</span>
                  <span className="text-xs text-neutral-500">
                    {codEnabled === false ? "Not available right now" : (
                      <>
                        Pay in cash when your order arrives.
                        {codFeePaise > 0 && (
                          <> A COD handling fee of <strong>{inr(codFeePaise)}</strong> will be added.</>
                        )}
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Customers pay through the store's default gateway (chosen by
                  admin in Settings) — no per-order chooser. The matching SDK
                  is preloaded so the lightbox opens fast on this page. */}
              {paymentMethod === "ONLINE" && onlinePaymentAvailable !== false && (
                <p className="mt-3 text-xs text-neutral-500">
                  Pay securely with {gateway === "CASHFREE" ? "Cashfree" : "Easebuzz"} — UPI, cards
                  &amp; netbanking.
                </p>
              )}

              <p className="flex items-center gap-2 text-xs text-neutral-500 mt-4">
                <ShieldCheck className="w-3.5 h-3.5" /> Payments are processed securely — the final
                amount is computed by the store at order time.
              </p>

              {!singlePage && (
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-12 px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
                  >
                    Back
                  </button>
                </div>
              )}
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
                      className="object-contain"
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
            {finalCodFee > 0 && (
              <div className="flex justify-between text-neutral-500">
                <dt>COD Fee</dt>
                <dd className="font-medium">{inr(finalCodFee)}</dd>
              </div>
            )}
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

          {singlePage && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
              <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 shrink-0" /> Free delivery over ₹999</span>
              <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 shrink-0" /> Open-box delivery</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Brand warranty</span>
              <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 shrink-0" /> Damaged/wrong? Replaced</span>
            </div>
          )}

          {step === 3 && belowMinOrder && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Minimum order value for delivery is <b>{inr(shipCfg.minOrderPaise)}</b> — add{" "}
              <b>{inr(shipCfg.minOrderPaise - subtotal)}</b> more to continue.
            </div>
          )}
          {(singlePage || step === 3) ? (
            <button
              onClick={placeOrder}
              disabled={placing || !addressReady || belowMinOrder}
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
            <ShieldCheck className="w-3.5 h-3.5" /> Secure checkout · Easy Replacement
          </p>
          {placedOrder === null && pendingPayment === null && (
            <p className="text-[11px] text-neutral-400 mt-2 text-center">
              Questions? <Link href="/contact" className="underline underline-offset-2 inline-flex items-center gap-1">Contact support <ExternalLink className="w-3 h-3" /></Link>
            </p>
          )}
        </aside>
      </div>

      {/* WS4: sticky bottom CTA on mobile for the single-page Buy Now flow.
          Sits above the MobileBottomNav (same offset the layout reserves). */}
      {singlePage && placedOrder === null && pendingPayment === null && !redirecting && (
        <div className="lg:hidden fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-4 py-3 shadow-xl">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-neutral-500 leading-none">Total</p>
              <p className="font-bold text-base leading-tight mt-0.5">{inr(total)}</p>
            </div>
            <button
              onClick={placeOrder}
              disabled={placing || !addressReady || belowMinOrder}
              className="h-12 px-8 shrink-0 inline-flex items-center justify-center gap-2 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {placing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {placing ? "Placing…" : `Pay ${inr(total)}`}
            </button>
          </div>
          {!addressReady && (
            <p className="text-center text-[11px] text-amber-700 mt-1.5">
              Add a delivery address to continue
            </p>
          )}
        </div>
      )}
    </div>
  );
}
