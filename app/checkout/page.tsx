"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Tag,
  X,
} from "lucide-react";
import { useCart, type Address } from "@/components/site/CartProvider";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const PAYMENT_METHODS = [
  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "cod", label: "Cash on Delivery", icon: Banknote },
];

const EMPTY: Address = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

export default function CheckoutPage() {
  const {
    items,
    subtotal,
    discount,
    shipping,
    total,
    applied,
    removeCoupon,
    address,
    setAddress,
    paymentMethod,
    setPaymentMethod,
    clear,
  } = useCart();

  const [form, setForm] = useState<Address>(address ?? EMPTY);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Prefill from a saved address once CartProvider rehydrates from localStorage.
  useEffect(() => {
    if (address) setForm(address);
  }, [address]);

  const update = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const formValid =
    form.name.trim() &&
    form.phone.trim().length >= 10 &&
    form.line1.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.pincode.trim().length === 6;

  const placeOrder = () => {
    if (!formValid) {
      toast.error("Please fill all required fields");
      return;
    }
    setAddress(form);
    setOrderId(`EMIVO${Date.now().toString().slice(-6)}`);
    setPlaced(true);
    clear();
    toast.success("Order placed successfully");
  };

  /* --------------------------- Success screen --------------------------- */
  if (placed) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight">Order placed!</h1>
        <p className="text-neutral-500 mt-3">
          Thank you, {form.name.split(" ")[0]}. Your order <span className="font-medium text-neutral-900">#{orderId}</span> has
          been confirmed. A confirmation has been sent to your registered details.
        </p>
        <div className="mt-8 border border-neutral-200 rounded-2xl p-5 text-left text-sm space-y-2">
          <p className="font-medium">Delivering to</p>
          <p className="text-neutral-600">
            {form.name}, {form.line1}
            {form.line2 ? `, ${form.line2}` : ""}, {form.city}, {form.state} — {form.pincode}
          </p>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shop"
            className="h-12 inline-flex items-center justify-center px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="h-12 inline-flex items-center justify-center px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  /* --------------------------- Empty cart guard --------------------------- */
  if (items.length === 0) {
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

  /* ------------------------------ Checkout form ------------------------------ */
  const inputCls =
    "h-12 w-full border border-neutral-200 rounded-xl px-4 text-sm focus:outline-none focus:border-neutral-950";

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_400px] gap-10 items-start">
        <div className="space-y-10">
          {/* Contact + Address */}
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-lg mb-4">
              <MapPin className="w-5 h-5" /> Shipping Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="addr-name">
                  Full name *
                </label>
                <input id="addr-name" value={form.name} onChange={update("name")} placeholder="Rahul Sharma" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="addr-phone">
                  Phone *
                </label>
                <input
                  id="addr-phone"
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="98765 43210"
                  inputMode="tel"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1.5" htmlFor="addr-line1">
                  Address *
                </label>
                <input
                  id="addr-line1"
                  value={form.line1}
                  onChange={update("line1")}
                  placeholder="Flat / House no., Street, Area"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1.5" htmlFor="addr-line2">
                  Landmark <span className="text-neutral-400">(optional)</span>
                </label>
                <input id="addr-line2" value={form.line2} onChange={update("line2")} placeholder="Near Metro Station" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="addr-city">
                  City *
                </label>
                <input id="addr-city" value={form.city} onChange={update("city")} placeholder="Mumbai" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="addr-state">
                  State *
                </label>
                <input id="addr-state" value={form.state} onChange={update("state")} placeholder="Maharashtra" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1.5" htmlFor="addr-pincode">
                  PIN code *
                </label>
                <input
                  id="addr-pincode"
                  value={form.pincode}
                  onChange={update("pincode")}
                  placeholder="400001"
                  inputMode="numeric"
                  maxLength={6}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Payment method */}
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-lg mb-4">
              <CreditCard className="w-5 h-5" /> Payment Method
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-sm font-medium transition-all ${
                      active ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-2 text-xs text-neutral-500 mt-3">
              <Lock className="w-3.5 h-3.5" /> 256-bit encrypted · Demo checkout — no real payment is processed
            </p>
          </section>
        </div>

        {/* Order summary */}
        <aside className="border border-neutral-200 rounded-3xl p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

          <div className="space-y-3 max-h-56 overflow-y-auto mb-4">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3">
                <img src={i.img} alt={i.name} className="w-14 h-14 object-cover rounded-xl bg-neutral-50" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{i.name}</p>
                  <p className="text-xs text-neutral-500">
                    Qty {i.qty} × {inr(i.price)}
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">{inr(i.price * i.qty)}</span>
              </div>
            ))}
          </div>

          {applied && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 rounded-full pl-3 pr-1.5 py-1.5 mb-4">
              <span className="text-sm font-medium inline-flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> {applied.code}
              </span>
              <button onClick={removeCoupon} className="p-1 hover:bg-green-100 rounded-full" aria-label="Remove coupon">
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
                <dt>Discount</dt>
                <dd className="font-medium">−{inr(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Shipping</dt>
              <dd className="font-medium">{shipping === 0 ? <span className="text-green-600">FREE</span> : inr(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{inr(total)}</dd>
            </div>
          </dl>

          <button
            onClick={placeOrder}
            className="mt-5 w-full h-12 grid place-items-center bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
          >
            Place Order · {inr(total)}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 mt-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure checkout · 10-day easy returns
          </p>
        </aside>
      </div>
    </div>
  );
}
