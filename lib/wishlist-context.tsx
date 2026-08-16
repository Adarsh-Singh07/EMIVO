"use client";

/**
 * Wishlist state shared across the storefront (header badge, product cards,
 * PDP toggle, wishlist page). Backed by the real /wishlist endpoints —
 * requires an authenticated user; guests get an empty set and callers
 * redirect to login before toggling.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { storeApi } from "./store-api";

interface WishlistCtxValue {
  /** Set of product ids currently in the wishlist. */
  ids: Set<string>;
  loading: boolean;
  count: number;
  has: (productId: string) => boolean;
  /** Adds/removes a product. Resolves to "added" | "removed". */
  toggle: (productId: string) => Promise<"added" | "removed">;
  /** Removes without toggling (wishlist page "Move to cart"). */
  remove: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistCtx = createContext<WishlistCtxValue | null>(null);

export const useWishlist = () => {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const data = await storeApi.getWishlist();
      setIds(new Set((data.items || []).map((i) => i.product_id)));
    } catch {
      // Non-fatal: badge/toggles just reflect an empty set until retry.
      setIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (productId: string): Promise<"added" | "removed"> => {
      if (ids.has(productId)) {
        await storeApi.removeFromWishlist(productId);
        setIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        return "removed";
      }
      await storeApi.addToWishlist(productId);
      setIds((prev) => new Set(prev).add(productId));
      return "added";
    },
    [ids]
  );

  const remove = useCallback(async (productId: string) => {
    await storeApi.removeFromWishlist(productId);
    setIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const value = useMemo<WishlistCtxValue>(
    () => ({
      ids,
      loading,
      count: ids.size,
      has: (productId: string) => ids.has(productId),
      toggle,
      remove,
      refresh,
    }),
    [ids, loading, toggle, remove, refresh]
  );

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}
