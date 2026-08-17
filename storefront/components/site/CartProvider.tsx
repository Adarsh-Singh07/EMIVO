"use client";

/**
 * Server-backed cart context.
 *
 * - Guest carts are keyed by the `X-Cart-Session` header (uuid persisted in
 *   localStorage by lib/store-api.ts getCartSessionId).
 * - Logged-in carts ride the Bearer token; the guest cart is merged into the
 *   account on login (best-effort, in lib/auth-context.tsx).
 * - All mutations go through the API with optimistic UI + rollback on failure.
 * - Money is integer paise; format with lib/format.ts `inr()`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type Cart, type CartItem } from "@/lib/store-api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Cart line enriched with display metadata (image) cached client-side. */
export type CartLine = CartItem & { img?: string };

/** Anything the add-to-cart buttons feed into the cart. */
export type AddableProduct = {
  /** Database product id (required for the API call). */
  id: string;
  name: string;
  brand?: string;
  price?: number; // paise — display only until the server responds
  mrp?: number; // paise
  img?: string;
  variantId?: string;
};

interface CartCtxValue {
  cart: Cart | null;
  lines: CartLine[];
  loading: boolean;
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  add: (product: AddableProduct, qty?: number) => Promise<boolean>;
  setQty: (itemId: string, qty: number) => void;
  removeLine: (itemId: string) => void;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
}

const CartCtx = createContext<CartCtxValue | null>(null);

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

/* ------------------------------------------------------------------ */
/* Display-metadata cache (product images for cart lines)              */
/* ------------------------------------------------------------------ */

const META_KEY = "elektrix_cart_meta";

type MetaMap = Record<string, { name?: string; img?: string; brand?: string }>;

function readMeta(): MetaMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as MetaMap) : {};
  } catch {
    return {};
  }
}

function writeMeta(meta: MetaMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* storage full — non-fatal */
  }
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [meta, setMeta] = useState<MetaMap>({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cartIdRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const c = await storeApi.getCart();
      cartIdRef.current = c.id;
      setCart(c);
    } catch {
      // No cart yet (fresh session) or API unreachable — keep empty state.
      cartIdRef.current = null;
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + reload whenever the auth identity settles/changes (the
  // guest cart is merged into the account during login, before user is set).
  useEffect(() => {
    if (authLoading) return;
    reload();
  }, [authLoading, user, reload]);

  // Hydrate the display-metadata cache after mount.
  useEffect(() => {
    setMeta(readMeta());
  }, []);

  const rememberProduct = useCallback((p: AddableProduct) => {
    if (!p.img) return;
    setMeta((prev) => {
      if (prev[p.id]?.img === p.img) return prev;
      const next = { ...prev, [p.id]: { ...prev[p.id], name: p.name, img: p.img, brand: p.brand } };
      writeMeta(next);
      return next;
    });
  }, []);

  /** Lazily fetch display info for lines whose image we don't know yet. */
  const enrichMissing = useCallback((items: CartItem[]) => {
    const missing = Array.from(
      new Set(items.filter((i) => !meta[i.product_id]).map((i) => i.product_id))
    ).slice(0, 12);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates: MetaMap = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const p = await storeApi.getProduct(id);
            const img = p.images && p.images.length > 0 ? p.images[0] : undefined;
            if (img) updates[id] = { name: p.name, img, brand: p.brand };
          } catch {
            /* leave placeholder */
          }
        })
      );
      if (!cancelled && Object.keys(updates).length > 0) {
        setMeta((prev) => {
          const next = { ...prev, ...updates };
          writeMeta(next);
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meta]);

  useEffect(() => {
    if (!cart?.items?.length) return;
    enrichMissing(cart.items);
  }, [cart, enrichMissing]);

  /* ------------------------------ Mutations ------------------------------ */

  const ensureCartId = useCallback(async (): Promise<string> => {
    if (cartIdRef.current) return cartIdRef.current;
    const c = await storeApi.getCart();
    cartIdRef.current = c.id;
    setCart(c);
    return c.id;
  }, []);

  const add = useCallback(
    async (product: AddableProduct, qty = 1): Promise<boolean> => {
      rememberProduct(product);
      const prevCart = cart;

      // Optimistic: bump quantity on an existing line or show a temp line.
      const existing = cart?.items.find(
        (i) => i.product_id === product.id && (i.variant_id ?? undefined) === (product.variantId ?? undefined)
      );
      if (existing) {
        setCart((c) =>
          c
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === existing.id ? { ...i, quantity: i.quantity + qty } : i
                ),
              }
            : c
        );
      } else {
        setCart((c) =>
          c
            ? {
                ...c,
                items: [
                  ...c.items,
                  {
                    id: `optimistic-${product.id}-${product.variantId ?? "base"}`,
                    product_id: product.id,
                    variant_id: product.variantId ?? null,
                    quantity: qty,
                    unit_price: product.price ?? 0,
                    subtotal: (product.price ?? 0) * qty,
                    product_name: product.name,
                    variant_name: null,
                    stock_available: null,
                    img: product.img,
                  },
                ],
              }
            : {
                id: "optimistic",
                subtotal: (product.price ?? 0) * qty,
                items: [
                  {
                    id: `optimistic-${product.id}-${product.variantId ?? "base"}`,
                    product_id: product.id,
                    variant_id: product.variantId ?? null,
                    quantity: qty,
                    unit_price: product.price ?? 0,
                    subtotal: (product.price ?? 0) * qty,
                    product_name: product.name,
                    variant_name: null,
                    stock_available: null,
                    img: product.img,
                  },
                ],
              }
        );
      }
      setDrawerOpen(true);

      try {
        const cartId = await ensureCartId();
        const updated = await storeApi.addCartItem(cartId, {
          product_id: product.id,
          variant_id: product.variantId,
          quantity: qty,
        });
        cartIdRef.current = updated?.id ?? cartId;
        setCart(updated);
        return true;
      } catch (err) {
        // Rollback the optimistic state and surface the real error.
        setCart(prevCart);
        const message = err instanceof Error ? err.message : "Could not add to cart";
        toast.error(message);
        return false;
      }
    },
    [cart, ensureCartId, rememberProduct]
  );

  const setQty = useCallback(
    (itemId: string, qty: number) => {
      if (!cart || qty < 1) return;
      const line = cart.items.find((i) => i.id === itemId);
      if (!line) return;
      if (
        line.stock_available != null &&
        line.stock_available > 0 &&
        qty > line.stock_available
      ) {
        toast.error(`Only ${line.stock_available} left in stock`);
        qty = line.stock_available;
      }
      const prevCart = cart;
      setCart((c) =>
        c ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i)) } : c
      );
      const cartId = cartIdRef.current;
      if (!cartId) return;
      storeApi
        .updateCartItem(cartId, itemId, qty)
        .then((updated) => {
          if (updated) setCart(updated);
        })
        .catch((err) => {
          setCart(prevCart);
          toast.error(err instanceof Error ? err.message : "Could not update quantity");
        });
    },
    [cart]
  );

  const removeLine = useCallback(
    (itemId: string) => {
      if (!cart) return;
      const prevCart = cart;
      setCart((c) => (c ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c));
      const cartId = cartIdRef.current;
      if (!cartId) return;
      storeApi
        .removeCartItem(cartId, itemId)
        .then((updated) => {
          if (updated && typeof updated === "object") setCart(updated);
        })
        .catch((err) => {
          setCart(prevCart);
          toast.error(err instanceof Error ? err.message : "Could not remove item");
        });
    },
    [cart]
  );

  const clear = useCallback(async () => {
    if (!cart) return;
    const prevCart = cart;
    setCart((c) => (c ? { ...c, items: [], subtotal: 0 } : c));
    const cartId = cartIdRef.current;
    if (!cartId) return;
    try {
      await storeApi.clearCart(cartId);
    } catch (err) {
      setCart(prevCart);
      toast.error(err instanceof Error ? err.message : "Could not clear cart");
    }
  }, [cart]);

  /* ------------------------------ Derived ------------------------------ */

  const lines: CartLine[] = useMemo(
    () =>
      (cart?.items ?? []).map((i) => ({
        ...i,
        img: meta[i.product_id]?.img,
      })),
    [cart, meta]
  );

  const count = useMemo(() => (cart?.items ?? []).reduce((s, i) => s + i.quantity, 0), [cart]);

  const subtotal = useMemo(() => {
    if (!cart) return 0;
    // Server subtotal is authoritative; fall back to line sum if absent.
    if (typeof cart.subtotal === "number" && cart.subtotal > 0) return cart.subtotal;
    return (cart.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
  }, [cart]);

  const value = useMemo<CartCtxValue>(
    () => ({
      cart,
      lines,
      loading,
      count,
      subtotal,
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      removeLine,
      clear,
      reload,
    }),
    [cart, lines, loading, count, subtotal, drawerOpen, add, setQty, removeLine, clear, reload]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

/** Shipping rule shown in the UI (backend computes the authoritative value). */
export const FREE_SHIPPING_THRESHOLD = 99900; // paise (₹999)
export const FLAT_SHIPPING = 9900; // paise (₹99)

export const displayShipping = (subtotal: number, discount = 0): number =>
  subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
