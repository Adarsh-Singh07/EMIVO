# ELEKTRIX v0.2 Storefront & Admin API Contract

Base URL: `NEXT_PUBLIC_API_URL` (production: `https://api.elektrix.in/api/v1`).
Auth: `Authorization: Bearer <access_token>` (15 min) + `refresh_token` (7 d, rotated on use).
Error envelope: `{"error": "<message>", "code": "<CODE>", "request_id": "..."}`.

## Money
ALL amounts are integer **paise** (₹2,700 = 270000). Display: `₹${(paise/100).toLocaleString("en-IN")}`.

## Storefront catalog (public)
- `GET /store/products?q=&category=<slug|id>&brand=&min_price=&max_price=&featured=&in_stock=&sort=relevance|price_asc|price_desc|newest|name|discount&page=&page_size=`
  → `{items: StoreProduct[], total, page, page_size, has_next, has_prev}`
- `GET /store/products/search?q=` → `[{id, name, slug, brand, image, effective_price}]`
- `GET /store/products/{slug|id}` → StoreProduct
- `GET /store/products/{slug}/related?limit=8` → StoreProduct[]
- `GET /store/categories` → `[{id, name, slug, parent_id, product_count, children: [...]}]` (tree, root categories at top)
- `GET /store/brands` → string[]

**StoreProduct**: `{id, name, slug, description, brand, sku, category_id, category_name, category_slug, price, mrp, effective_price, discount_percent, on_offer, status, featured, specs: [{name,value}], tags, images: string[], variants: [{id,name,sku,price}], stock: {on_hand, reserved, available, in_stock} | null, created_at}`

## Auth
- `POST /auth/register {email, password≥8, first_name, last_name}` → 201 User
- `POST /auth/login {email, password}` → `{access_token, refresh_token, token_type, expires_in}`
- `POST /auth/refresh {refresh_token}` → new pair (old one invalidated; reuse kills the family)
- `POST /auth/logout {refresh_token}` → 204
- `POST /auth/forgot-password {email}` → 202 always
- `POST /auth/reset-password {token, new_password}` → 200
- `POST /auth/change-password {current_password, new_password}` (auth) → 200
- `GET /users/me` (auth) / `PUT /users/me {first_name?, last_name?}`

## Cart (guest: send `X-Cart-Session: <uuid>` header everywhere)
- `GET /carts` (auth optional; guests need the header) → Cart
- `POST /carts/{cart_id}/items {product_id, variant_id?, quantity}` (409 INSUFFICIENT_STOCK)
- `PATCH /carts/{cart_id}/items/{item_id} {quantity}` / `DELETE .../items/{item_id}`
- `POST /carts/{cart_id}/clear`
- `POST /carts/merge {session_id}` (auth, right after login) → user Cart
- Cart: `{id, business_id, user_id, session_id, subtotal, items: [{id, product_id, variant_id, quantity, unit_price, subtotal, product_name, variant_name, stock_available}], ...}`

## Addresses (auth)
- `GET /addresses` → `{items}` · `POST /addresses {full_name, phone(10d), line1, line2?, city, state, pincode(6d), country='IN', label?, is_default?}`
- `PUT /addresses/{id}` · `POST /addresses/{id}/default` · `DELETE /addresses/{id}`
- First address auto-defaults.

## Wishlist (auth)
- `GET /wishlist` → `{items: [{id, product_id, created_at, product: StoreProduct}]}`
- `POST /wishlist/{product_id}` (idempotent) · `DELETE /wishlist/{product_id}`

## Coupons
- `POST /coupons/validate {code, cart_subtotal}` (auth) → `{is_valid, coupon?, discount_amount, message}`
  (per-user limit enforced against the TOKEN identity; redemption happens in checkout)

## Checkout (auth required — guests are redirected to login)
- `POST /orders/checkout {items?: [{product_id, variant_id?, quantity}] | omitted→server cart, address_id? | shipping_address: {...}, coupon_code?, payment_method: 'COD'|'ONLINE', notes?, idempotency_key?}`
  → `{order: OrderV2, payment_required: bool, payment_id?}`
  - Errors: 409 OUT_OF_STOCK, 400 COUPON_* / COD_DISABLED / COD_LIMIT / CART_EMPTY, 422 validation
- OrderV2 adds: `order_number ('ELK-YYMMDD-XXXXXX'), payment_method, coupon_code, tracking_number, tracking_url, shipped_at, delivered_at` + base fields (`id, status, subtotal, tax_total, shipping_total, discount_total, total, currency, shipping_address, items[{product_id, product_name, variant_name, quantity, unit_price, subtotal}], created_at`)
- `GET /orders?page=&page_size=&status=` (customers auto-scoped to own)
- `GET /orders/{id}` · `GET /orders/track/{order_number}` (ownership enforced)
- Order status flow: PENDING → PAYMENT_PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED; CANCELLED / REFUNDED / PAYMENT_FAILED.

## Payments
- `POST /payments/initiate {order_id, idempotency_key, amount?}` (auth, own order, must equal order.total)
  → `{payment, provider: 'cashfree'|'mock', checkout: {client_id, environment, payment_session_id, provider_order_id, amount, currency, name, description}}`
  - Open Cashfree Web Checkout via the Cashfree JS SDK: `Cashfree.checkout({paymentSessionId: checkout.payment_session_id, redirectTarget: "_modal"})`.
  - Client-side verification: `POST /payments/{payment_id}/verify-success {provider_payment_id, provider_signature?, provider_order_id?}` — for Cashfree, the backend verifies by calling the Cashfree API with the order ID rather than checking a signature.
- Payment statuses: CREATED / PENDING / SUCCESS / FAILED / REFUNDED. Webhooks confirm server-side independently.
- Webhook: `POST /payments/webhook/cashfree` (signature-verified, idempotent by event ID).

## Notifications (auth)
- `GET /notifications?unread_only=&limit=` → `{items: [{id, type, title, body, link, read_at, created_at}], unread_count}`
- `POST /notifications/{id}/read` · `POST /notifications/read-all`

## Newsletter (public)
- `POST /newsletter/subscribe {email}` → `{subscribed, message}` (idempotent)

## Admin (roles: owner/staff/platform_admin — 403 otherwise)
- `GET /admin/dashboard` → `{today_orders, today_revenue_paise, pending_orders, processing_orders, low_stock_count, out_of_stock_count, pending_payments, total_customers, active_offers, revenue_14d: [{date, revenue_paise, orders}], recent_orders: [...], top_products_30d: [{product_id, product_name, qty, revenue_paise}]}`
- `GET /admin/users?q=&page=` · `GET/PUT /admin/store-settings` `{cod_enabled, cod_fee_paise, cod_max_order_paise, free_shipping_threshold_paise, flat_shipping_paise, banner: {title, subtitle, image_url, link, active}, announcement}`
- `GET /inventory?q=&low_stock=&out_of_stock=&page=` → `{items: [{product_id, product_name, product_sku, on_hand, reserved, available, low_stock_threshold, is_low_stock, is_out_of_stock}]}`
- `POST /inventory/{product_id}/adjust {mode: set|delta|restock|damage|return, value, low_stock_threshold?, note?}`
- `GET /inventory/movements?product_id=&limit=`
- Products CRUD: `POST /products/ {name, price, mrp?, sale_price?, offer_starts_at?, offer_ends_at?, brand?, sku?, description?, status: DRAFT|ACTIVE|ARCHIVED, featured?, category_id?, specs?: [{name,value}], tags?, media?: [{media_url, position?, alt_text?}], initial_stock?}`
  `PUT /products/{id}` (fields; explicit null clears mrp/sale_price/offer_*/category_id) · `DELETE /products/{id}` (archive)
  `POST /products/{id}/media {media_url, position?, alt_text?}` · `DELETE /products/media/{id}` · `POST /products/{id}/media/reorder [ids]`
  `POST /products/{id}/variants {name, sku?, price}` · `PUT /products/variants/{id}` · `DELETE /products/variants/{id}`
  `POST /products/categories {name, parent_id?, position?}`
- Orders: `PATCH /orders/{id}/status {status, reason?, tracking_number?, tracking_url?}` (state machine enforced)
- Payments: `GET /payments?order_id=&status=` · `POST /payments/{id}/refund {amount?, reason?}`
- Coupons: `GET/POST /coupons/` · `PATCH /coupons/{id}` · `DELETE /coupons/{id}` (soft)
- `POST /media/presign {filename, content_type, size_bytes≤10MB}` → `{upload_url, public_url, key}` (PUT the file to upload_url with the content-type, then use public_url as media_url)
