"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Coupon = {
  type: "percent" | "flat" | "ship";
  value: number;
  label: string;
  min?: number;
};

export const COUPONS: Record<string, Coupon> = {
  ELEKTRIX10: { type: "percent", value: 10, label: "10% off entire order" },
  SAVE500: { type: "flat", value: 500, label: "₹500 flat off (min ₹3,000)", min: 3000 },
  WELCOME: { type: "flat", value: 1000, label: "₹1,000 off (min ₹5,000)", min: 5000 },
  FREESHIP: { type: "ship", value: 0, label: "Free shipping on any order" },
};

export type CartItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  img: string;
  qty: number;
};

export type AppliedCoupon = Coupon & {
  code: string;
  invalid?: boolean;
  reason?: string;
};

export type Address = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type AddableProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  img: string;
};

type CartCtxValue = {
  items: CartItem[];
  add: (product: AddableProduct, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  couponCode: string;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
  applied: AppliedCoupon | null;
  discount: number;
  shipping: number;
  total: number;
  address: Address | null;
  setAddress: (address: Address | null) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
};

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const CartCtx = createContext<CartCtxValue | null>(null);

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage on mount (avoid SSR mismatch).
  useEffect(() => {
    try {
      const s = localStorage.getItem("elektrix_cart");
      if (s) setItems(JSON.parse(s));
      const c = localStorage.getItem("elektrix_coupon");
      if (c) setCouponCode(c);
      const a = localStorage.getItem("elektrix_address");
      if (a) setAddress(JSON.parse(a));
    } catch (e) {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("elektrix_cart", JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("elektrix_coupon", couponCode);
  }, [couponCode, hydrated]);

  useEffect(() => {
    if (hydrated && address) localStorage.setItem("elektrix_address", JSON.stringify(address));
  }, [address, hydrated]);

  const add = useCallback((product: AddableProduct, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          mrp: product.mrp,
          img: product.img,
          qty,
        },
      ];
    });
    setDrawerOpen(true);
  }, []);

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const setQty = useCallback(
    (id: string, qty: number) =>
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i))),
    []
  );

  const clear = useCallback(() => {
    setItems([]);
    setCouponCode("");
  }, []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  const applied = useMemo<AppliedCoupon | null>(() => {
    const key = couponCode?.trim().toUpperCase();
    if (!key || !COUPONS[key]) return null;
    const c = COUPONS[key];
    if (c.min && subtotal < c.min) {
      return {
        code: key,
        ...c,
        invalid: true,
        reason: `Add ₹${(c.min - subtotal).toLocaleString("en-IN")} more to unlock`,
      };
    }
    return { code: key, ...c };
  }, [couponCode, subtotal]);

  const discount = useMemo(() => {
    if (!applied || applied.invalid) return 0;
    if (applied.type === "percent") return Math.round((subtotal * applied.value) / 100);
    if (applied.type === "flat") return applied.value;
    return 0;
  }, [applied, subtotal]);

  const shipping =
    items.length === 0
      ? 0
      : applied?.type === "ship" && !applied.invalid
        ? 0
        : subtotal - discount > 999
          ? 0
          : 99;

  const total = Math.max(0, subtotal - discount + shipping);

  const applyCoupon = useCallback((code: string) => setCouponCode(code || ""), []);
  const removeCoupon = useCallback(() => setCouponCode(""), []);

  return (
    <CartCtx.Provider
      value={{
        items,
        add,
        remove,
        setQty,
        clear,
        count,
        subtotal,
        drawerOpen,
        setDrawerOpen,
        couponCode,
        applyCoupon,
        removeCoupon,
        applied,
        discount,
        shipping,
        total,
        address,
        setAddress,
        paymentMethod,
        setPaymentMethod,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}
