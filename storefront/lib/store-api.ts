/**
 * ELEKTRIX v0.2 storefront API client.
 *
 * Typed wrapper over the /store, /carts, /orders/checkout, /payments,
 * /wishlist, /addresses, /coupons, /notifications and /newsletter endpoints
 * documented in docs/API_V02_CONTRACT.md.
 *
 * - Auth + refresh-token rotation are handled by lib/api-client.ts `fetchApi`.
 * - Guest carts send `X-Cart-Session: <uuid>` (see getCartSessionId()).
 * - ALL monetary values are integer paise. Format with lib/format.ts `inr()`.
 */

import { fetchApi, getAccessToken } from "./api-client";

/* ------------------------------------------------------------------ */
/* Types (contract-shaped)                                             */
/* ------------------------------------------------------------------ */

export interface StoreStock {
  on_hand: number;
  reserved: number;
  available: number;
  in_stock: boolean;
}

export interface StoreSpec {
  name: string;
  value: string;
}

export interface StoreVariant {
  id: string;
  name: string;
  sku?: string;
  price: number; // paise
}

export interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  sku?: string;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  price: number; // paise
  mrp?: number; // paise
  effective_price: number; // paise — authoritative selling price
  discount_percent?: number;
  on_offer?: boolean;
  status?: string;
  featured?: boolean;
  specs?: StoreSpec[];
  tags?: string[];
  images?: string[];
  variants?: StoreVariant[];
  stock?: StoreStock | null;
  created_at?: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  product_count?: number;
  children?: StoreCategory[];
}

export interface ProductListParams {
  q?: string;
  category?: string; // slug or id
  brand?: string;
  min_price?: number; // paise
  max_price?: number; // paise
  featured?: boolean;
  in_stock?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "name" | "discount";
  page?: number;
  page_size?: number;
}

export interface ProductPage {
  items: StoreProduct[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  image?: string;
  effective_price: number; // paise
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number; // paise
  subtotal: number; // paise
  product_name: string;
  variant_name?: string | null;
  stock_available?: number | null;
}

export interface Cart {
  id: string;
  business_id?: string;
  user_id?: string | null;
  session_id?: string | null;
  subtotal: number; // paise
  items: CartItem[];
}

export interface Address {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  label?: string | null;
  is_default: boolean;
  created_at?: string;
}

export type AddressInput = Omit<Address, "id" | "is_default" | "created_at"> & {
  is_default?: boolean;
};

export interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product: StoreProduct;
}

export interface CouponValidation {
  is_valid: boolean;
  coupon?: { code: string; description?: string } & Record<string, unknown>;
  discount_amount: number; // paise
  message: string;
}

export interface ShippingAddressInput {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CheckoutPayload {
  items?: Array<{ product_id: string; variant_id?: string; quantity: number }>;
  address_id?: string;
  shipping_address?: ShippingAddressInput;
  coupon_code?: string;
  payment_method: "COD" | "ONLINE";
  notes?: string;
  idempotency_key?: string;
}

export interface OrderItemV2 {
  product_id: string;
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price: number; // paise
  subtotal: number; // paise
}

export interface OrderV2 {
  id: string;
  order_number?: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
    | string;
  subtotal: number;
  tax_total?: number;
  shipping_total: number;
  discount_total: number;
  total: number; // paise
  currency: string;
  payment_method?: "COD" | "ONLINE" | string;
  payment_status?: string;
  coupon_code?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  shipping_address?: ShippingAddressInput & { name?: string; street?: string };
  items: OrderItemV2[];
  created_at: string;
}

export interface CheckoutResponse {
  order: OrderV2;
  payment_required: boolean;
  payment_id?: string;
}

export interface PaymentInitiateResponse {
  payment: { id: string; status?: string } & Record<string, unknown>;
  provider: "cashfree" | "mock" | string;
  checkout: {
    client_id: string;
    environment: string;
    payment_session_id?: string;
    provider_order_id: string;
    amount: number; // paise
    currency: string;
    name?: string;
    description?: string;
  };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  unread_count: number;
}

/* ------------------------------------------------------------------ */
/* Cart session (guest carts)                                          */
/* ------------------------------------------------------------------ */

const CART_SESSION_KEY = "elektrix_cart_session";

/** Rudimentary RFC4122 v4 UUID — crypto.randomUUID where available. */
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns the persisted guest cart session id, creating one on first use.
 * Sent as the `X-Cart-Session` header on every cart call so guest carts
 * survive reloads and can be merged into the account on login.
 */
export function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(CART_SESSION_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(CART_SESSION_KEY, id);
  }
  return id;
}

/** Extra headers for cart endpoints (guest session id). */
function cartHeaders(): Record<string, string> {
  const session = typeof window === "undefined" ? "" : getCartSessionId();
  return session ? { "X-Cart-Session": session } : {};
}

/* ------------------------------------------------------------------ */
/* Store catalog (public)                                              */
/* ------------------------------------------------------------------ */

export const storeApi = {
  /* ----- Catalog ----- */

  listProducts(params: ProductListParams = {}): Promise<ProductPage> {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.brand) sp.set("brand", params.brand);
    if (params.min_price != null) sp.set("min_price", String(params.min_price));
    if (params.max_price != null) sp.set("max_price", String(params.max_price));
    if (params.featured) sp.set("featured", "true");
    if (params.in_stock) sp.set("in_stock", "true");
    if (params.sort) sp.set("sort", params.sort);
    if (params.page) sp.set("page", String(params.page));
    if (params.page_size) sp.set("page_size", String(params.page_size));
    const qs = sp.toString();
    return fetchApi<ProductPage>(`/store/products${qs ? `?${qs}` : ""}`);
  },

  searchProducts(q: string): Promise<SearchSuggestion[]> {
    return fetchApi<SearchSuggestion[]>(
      `/store/products/search?q=${encodeURIComponent(q)}`
    );
  },

  getProduct(idOrSlug: string): Promise<StoreProduct> {
    return fetchApi<StoreProduct>(`/store/products/${encodeURIComponent(idOrSlug)}`);
  },

  getRelated(slugOrId: string, limit = 8): Promise<StoreProduct[]> {
    return fetchApi<StoreProduct[]>(
      `/store/products/${encodeURIComponent(slugOrId)}/related?limit=${limit}`
    );
  },

  getCategories(): Promise<StoreCategory[]> {
    return fetchApi<StoreCategory[]>("/store/categories");
  },

  getBrands(): Promise<string[]> {
    return fetchApi<string[]>("/store/brands");
  },

  /* ----- Cart (guest: X-Cart-Session; logged-in: Bearer) ----- */

  getCart(): Promise<Cart> {
    return fetchApi<Cart>("/carts", { headers: cartHeaders() });
  },

  addCartItem(
    cartId: string,
    item: { product_id: string; variant_id?: string; quantity: number }
  ): Promise<Cart> {
    return fetchApi<Cart>(`/carts/${cartId}/items`, {
      method: "POST",
      body: JSON.stringify(item),
      headers: cartHeaders(),
    });
  },

  updateCartItem(cartId: string, itemId: string, quantity: number): Promise<Cart> {
    return fetchApi<Cart>(`/carts/${cartId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
      headers: cartHeaders(),
    });
  },

  removeCartItem(cartId: string, itemId: string): Promise<Cart | void> {
    return fetchApi<Cart | void>(`/carts/${cartId}/items/${itemId}`, {
      method: "DELETE",
      headers: cartHeaders(),
    });
  },

  clearCart(cartId: string): Promise<Cart | void> {
    return fetchApi<Cart | void>(`/carts/${cartId}/clear`, {
      method: "POST",
      headers: cartHeaders(),
    });
  },

  /** Merge the guest session cart into the logged-in user's cart (auth). */
  mergeCart(sessionId: string): Promise<Cart> {
    return fetchApi<Cart>("/carts/merge", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  /* ----- Addresses (auth) ----- */

  listAddresses(): Promise<{ items: Address[] }> {
    return fetchApi<{ items: Address[] }>("/addresses");
  },

  createAddress(data: AddressInput): Promise<Address> {
    return fetchApi<Address>("/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateAddress(id: string, data: Partial<AddressInput>): Promise<Address> {
    return fetchApi<Address>(`/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  setDefaultAddress(id: string): Promise<Address | void> {
    return fetchApi<Address | void>(`/addresses/${id}/default`, { method: "POST" });
  },

  deleteAddress(id: string): Promise<void> {
    return fetchApi<void>(`/addresses/${id}`, { method: "DELETE" });
  },

  /* ----- Wishlist (auth) ----- */

  getWishlist(): Promise<{ items: WishlistItem[] }> {
    return fetchApi<{ items: WishlistItem[] }>("/wishlist");
  },

  addToWishlist(productId: string): Promise<void> {
    return fetchApi<void>(`/wishlist/${productId}`, { method: "POST" });
  },

  removeFromWishlist(productId: string): Promise<void> {
    return fetchApi<void>(`/wishlist/${productId}`, { method: "DELETE" });
  },

  /* ----- Coupons (auth) ----- */

  validateCoupon(code: string, cartSubtotal: number): Promise<CouponValidation> {
    return fetchApi<CouponValidation>("/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, cart_subtotal: cartSubtotal }),
    });
  },

  /* ----- Checkout & payments (auth) ----- */

  checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    return fetchApi<CheckoutResponse>("/orders/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  trackOrder(orderNumber: string): Promise<OrderV2> {
    return fetchApi<OrderV2>(`/orders/track/${encodeURIComponent(orderNumber)}`);
  },

  listOrders(params: { page?: number; page_size?: number; status?: string } = {}): Promise<{
    items: OrderV2[];
    total?: number;
    page?: number;
  }> {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.page_size) sp.set("page_size", String(params.page_size));
    if (params.status) sp.set("status", params.status);
    const qs = sp.toString();
    return fetchApi(`/orders${qs ? `?${qs}` : ""}`);
  },

  initiatePayment(payload: {
    order_id: string;
    idempotency_key: string;
    amount?: number;
  }): Promise<PaymentInitiateResponse> {
    return fetchApi<PaymentInitiateResponse>("/payments/initiate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /* ----- Notifications (auth) ----- */

  listNotifications(params: { unread_only?: boolean; limit?: number } = {}): Promise<NotificationPage> {
    const sp = new URLSearchParams();
    if (params.unread_only) sp.set("unread_only", "true");
    if (params.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return fetchApi<NotificationPage>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  markNotificationRead(id: string): Promise<void> {
    return fetchApi<void>(`/notifications/${id}/read`, { method: "POST" });
  },

  markAllNotificationsRead(): Promise<void> {
    return fetchApi<void>("/notifications/read-all", { method: "POST" });
  },

  /* ----- Newsletter (public) ----- */

  subscribeToNewsletter(email: string): Promise<{ subscribed: boolean; message: string }> {
    return fetchApi<{ subscribed: boolean; message: string }>("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};

/** True when an access token cookie exists (cheap client-side auth check). */
export const hasAuthToken = (): boolean => Boolean(getAccessToken());
