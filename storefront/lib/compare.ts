"use client";

/**
 * Compare list + recently-viewed tracker — small localStorage-backed stores
 * shared across components. Changes emit a custom event so open components
 * (header badge, compare page) stay in sync.
 */

import { useCallback, useEffect, useState } from "react";

const COMPARE_KEY = "elektrix_compare";
const RECENT_KEY = "elektrix_recent";
export const COMPARE_MAX = 4;
const RECENT_MAX = 12;

const EVENT = "elektrix:local-store";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
}

/* ------------------------------------------------------------------ */
/* Compare                                                             */
/* ------------------------------------------------------------------ */

export const getCompareIds = (): string[] => readList(COMPARE_KEY);

export function toggleCompare(id: string): { added: boolean; ids: string[] } {
  const current = getCompareIds();
  const exists = current.includes(id);
  let next: string[];
  if (exists) {
    next = current.filter((x) => x !== id);
  } else {
    if (current.length >= COMPARE_MAX) return { added: false, ids: current };
    next = [...current, id];
  }
  writeList(COMPARE_KEY, next);
  return { added: !exists, ids: next };
}

export const clearCompare = () => writeList(COMPARE_KEY, []);

export const inCompare = (id: string) => getCompareIds().includes(id);

/** Reactive compare ids — stays in sync across tabs and components. */
export function useCompareIds(): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(getCompareIds());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return ids;
}

/* ------------------------------------------------------------------ */
/* Recently viewed                                                     */
/* ------------------------------------------------------------------ */

export interface RecentProduct {
  id: string;
  slug: string;
  name: string;
  img: string;
  price: number; // paise
}

export const getRecent = (): RecentProduct[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.id === "string") : [];
  } catch {
    return [];
  }
};

/** Record a product view (deduped, newest first, capped). */
export function pushRecent(product: RecentProduct) {
  if (typeof window === "undefined") return;
  const rest = getRecent().filter((p) => p.id !== product.id);
  const next = [product, ...rest].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key: RECENT_KEY } }));
}

/** Reactive recently-viewed list. */
export function useRecentlyViewed(excludeId?: string): RecentProduct[] {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    const sync = () => setItems(getRecent());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  return useCallback(
    () => (excludeId ? items.filter((i) => i.id !== excludeId) : items),
    [items, excludeId]
  )();
}
