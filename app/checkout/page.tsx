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
  Plus,
} from "lucide-react";
import { useCart, type Address } from "@/components/site/CartProvider";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { fetchApiProducts } from "@/lib/products";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

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

  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>("");
  const [saveAddressToProfile, setSaveAddressToProfile] = useState<boolean>(false);

  // Prefill default saved address on mount if user is logged in
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const defaultAddr = (user.addresses as any[]).find((a: any) => a.isDefault) || user.addresses[0];
      if (defaultAddr) {
        setForm(defaultAddr);
        setSelectedSavedAddressId(defaultAddr.id);
      }
    } else if (address) {
      setForm(address);
    }
  }, [user, address]);

  const selectSavedAddress = (id: string) => {
    setSelectedSavedAddressId(id);
    if (id === "new") {
      setForm(EMPTY);
      setSaveAddressToProfile(true);
    } else {
      const selected = (user?.addresses as any[] || []).find((a) => a.id === id);
      if (selected) {
        setForm(selected);
        setSaveAddressToProfile(false);
      }
    }
  };

  const placeOrder = async () => {
    if (!formValid) {
      toast.error("Please fill all required fields");
      return;
    }
    setIsSubmitting(true);
    setAddress(form);

    try {
      if (paymentMethod === "upi") {
        toast.info("UPI payments are currently in test mode. Placing order...");
      }

      // If user is logged in, try to save address to profile first if checked
      if (user && saveAddressToProfile && selectedSavedAddressId === "new") {
        const newAddr = {
          id: `addr_${Date.now()}`,
          name: form.name,
          phone: form.phone,
          line1: form.line1,
          line2: form.line2 || "",
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          isDefault: (user.addresses || []).length === 0,
        };
        const updatedList = [...(user.addresses || []), newAddr];
        await apiClient.put("/users/me", { addresses: updatedList });
      }

      // Resolve product slugs in cart to valid database UUIDs if possible
      const dbProducts = await fetchApiProducts({ page_size: 100 });
      const apiItems = [];

      for (const cartItem of items) {
        const matched = dbProducts.find(
          (p: any) => p.id === cartItem.id || p.name.toLowerCase() === cartItem.name.toLowerCase()
        );
        if (matched && /^[0-9a-f-]{36}$/i.test(matched.id)) {
          apiItems.push({
            product_id: matched.id,
            quantity: cartItem.qty,
          });
        }
      }

      // If we resolved valid UUID items and the user is authenticated, create a real order via API
      if (user && apiItems.length === items.length) {
        const orderPayload = {
          shipping_address: {
            name: form.name,
            street: form.line1 + (form.line2 ? ` ${form.line2}` : ""),
            city: form.city,
            state: form.state,
            postal_code: form.pincode,
            country: "IN", // ISO alpha-2
            phone: form.phone,
          },
          items: apiItems,
          notes: `Storefront order via ${paymentMethod} (${paymentMethod === "upi" ? "simulated UPI" : "COD"})`,
        };
        const response = await apiClient.post<{ id: string }>("/orders/", orderPayload);
        setOrderId(response.id);
      } else {
        // Guest or fallback flow — generate local reference number
        setOrderId(`ELK${Date.now().toString().slice(-6)}`);
      }

      clear();
      setPlaced(true);
      toast.success(paymentMethod === "upi" ? "Order created. Payment pending." : "Order placed successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            {user?.addresses && (user.addresses as any[]).length > 0 && (
              <div className="mb-6 bg-neutral-50 p-5 rounded-2xl border border-neutral-200 col-span-1 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3 block">
                  Select Saved Address
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(user.addresses as any[]).map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectSavedAddress(addr.id)}
                      className={`text-left p-4 rounded-xl border text-sm transition-all ${
                        selectedSavedAddressId === addr.id
                          ? "border-neutral-950 bg-white ring-1 ring-neutral-950"
                          : "border-neutral-200 bg-white hover:border-neutral-400"
                      }`}
                    >
                      <p className="font-semibold mb-1 truncate">{addr.name}</p>
                      <p className="text-xs text-neutral-500 line-clamp-1">{addr.line1}, {addr.city}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => selectSavedAddress("new")}
                    className={`text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-center gap-2 ${
                      selectedSavedAddressId === "new"
                        ? "border-neutral-950 bg-white ring-1 ring-neutral-950"
                        : "border-dashed border-neutral-300 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <Plus className="w-4 h-4" /> Add a new address
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-1 sm:col-span-2">
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

              {user && selectedSavedAddressId === "new" && (
                <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="save-profile"
                    checked={saveAddressToProfile}
                    onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                    className="rounded border-neutral-300 focus:ring-neutral-950 h-4 w-4 text-neutral-950"
                  />
                  <label htmlFor="save-profile" className="text-xs text-neutral-500 font-medium cursor-pointer">
                    Save this address to my profile
                  </label>
                </div>
              )}
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

            {paymentMethod === "upi" && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <span className="font-semibold block mb-1">⚠️ Test Mode: Simulated UPI Payment Flow</span>
                This checkout runs in simulation/sandbox mode. UPI payment will be simulated, and the order will automatically transition to confirmed/pending state without requiring any banking credentials or real money transactions.
              </div>
            )}
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
            disabled={isSubmitting || !formValid}
            className="mt-5 w-full h-12 grid place-items-center bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Placing Order…" : `Place Order · ${inr(total)}`}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 mt-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure checkout · 10-day easy returns
          </p>
        </aside>
      </div>
    </div>
  );
}
