-- ============================================================================
-- ELEKTRIX v0.2 — RLS policies for commerce tables
-- Applied as the 'emivo_app' role (see scripts/apply_all_rls.py).
-- Session GUCs set by the API:
--   app.user_id     — authenticated user id (empty for anonymous)
--   app.business_id — tenant id (store business for storefront flows)
--   app.role        — highest role from the JWT (customer|staff|owner|platform_admin)
-- ============================================================================

-- Helper: is the current session a staff-level role?
CREATE OR REPLACE FUNCTION elektrix_is_staff() RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin');
$$;

GRANT EXECUTE ON FUNCTION elektrix_is_staff() TO emivo_app;

-- ---------------------------------------------------------------------------
-- inventory / inventory_movements — staff manage, tenant-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_tenant ON inventory;
CREATE POLICY inventory_tenant ON inventory
    FOR ALL
    USING (
        business_id = NULLIF(current_setting('app.business_id', true), '')
    )
    WITH CHECK (
        business_id = NULLIF(current_setting('app.business_id', true), '')
    );

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_movements_tenant ON inventory_movements;
CREATE POLICY inventory_movements_tenant ON inventory_movements
    FOR ALL
    USING (
        business_id = NULLIF(current_setting('app.business_id', true), '')
    )
    WITH CHECK (
        business_id = NULLIF(current_setting('app.business_id', true), '')
    );

-- ---------------------------------------------------------------------------
-- addresses — strictly owner-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS addresses_owner ON addresses;
CREATE POLICY addresses_owner ON addresses
    FOR ALL
    USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
    WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));

-- Staff never needs customer addresses directly (orders carry snapshots).

-- ---------------------------------------------------------------------------
-- wishlist_items — strictly owner-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wishlist_owner ON wishlist_items;
CREATE POLICY wishlist_owner ON wishlist_items
    FOR ALL
    USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
    WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));

-- ---------------------------------------------------------------------------
-- notifications — owner reads + marks read; inserts allowed for worker
-- sessions (business context set) or the owner themselves
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications
    FOR SELECT
    USING (user_id = NULLIF(current_setting('app.user_id', true), ''));
DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications
    FOR UPDATE
    USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
    WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications
    FOR INSERT
    WITH CHECK (
        user_id = NULLIF(current_setting('app.user_id', true), '')
        OR NULLIF(current_setting('app.business_id', true), '') IS NOT NULL
    );

-- ---------------------------------------------------------------------------
-- newsletter_subscribers — anonymous insert only (rate-limited at app layer);
-- reads restricted to staff sessions
-- ---------------------------------------------------------------------------
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS newsletter_insert ON newsletter_subscribers;
CREATE POLICY newsletter_insert ON newsletter_subscribers
    FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS newsletter_staff_read ON newsletter_subscribers;
CREATE POLICY newsletter_staff_read ON newsletter_subscribers
    FOR SELECT USING (elektrix_is_staff());

-- ---------------------------------------------------------------------------
-- payment_events — was unprotected. Tenant staff read; writes allowed from
-- sessions in the same tenant (checkout writes during customer payment).
-- ---------------------------------------------------------------------------
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_events_tenant ON payment_events;
CREATE POLICY payment_events_tenant ON payment_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_events.payment_id
              AND (
                p.business_id = NULLIF(current_setting('app.business_id', true), '')
                OR elektrix_is_staff()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_events.payment_id
              AND (
                p.business_id = NULLIF(current_setting('app.business_id', true), '')
                OR elektrix_is_staff()
              )
        )
    );

-- ---------------------------------------------------------------------------
-- users — tighten the wide-open SELECT: anonymous sessions (login lookups)
-- may query, but authenticated non-staff users can only see their own row.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS users_select_policy ON users;
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (
        NULLIF(current_setting('app.user_id', true), '') IS NULL
        OR id = NULLIF(current_setting('app.user_id', true), '')
        OR elektrix_is_staff()
    );

-- ---------------------------------------------------------------------------
-- orders / order_items — customers see only their own orders within the
-- store tenant; staff see all tenant orders. (Was tenant-only → IDOR.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant isolation for orders" ON orders;
CREATE POLICY "Tenant isolation for orders" ON orders
    FOR ALL
    USING (
        business_id = NULLIF(current_setting('app.business_id', true), '')
        AND (
            user_id = NULLIF(current_setting('app.user_id', true), '')
            OR elektrix_is_staff()
        )
    )
    WITH CHECK (
        business_id = NULLIF(current_setting('app.business_id', true), '')
        AND (
            user_id = NULLIF(current_setting('app.user_id', true), '')
            OR elektrix_is_staff()
        )
    );

DROP POLICY IF EXISTS "Tenant isolation for order_items" ON order_items;
CREATE POLICY "Tenant isolation for order_items" ON order_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
              AND o.business_id = NULLIF(current_setting('app.business_id', true), '')
              AND (
                o.user_id = NULLIF(current_setting('app.user_id', true), '')
                OR elektrix_is_staff()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
              AND o.business_id = NULLIF(current_setting('app.business_id', true), '')
              AND (
                o.user_id = NULLIF(current_setting('app.user_id', true), '')
                OR elektrix_is_staff()
              )
        )
    );

-- ---------------------------------------------------------------------------
-- carts / cart_items — guest carts (user_id NULL) stay tenant-scoped with
-- app-layer session ownership checks; user carts are owner-scoped.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation_carts ON carts;
CREATE POLICY tenant_isolation_carts ON carts
    FOR ALL
    USING (
        business_id = NULLIF(current_setting('app.business_id', true), '')
        AND (
            user_id IS NULL
            OR user_id = NULLIF(current_setting('app.user_id', true), '')
            OR elektrix_is_staff()
        )
    )
    WITH CHECK (
        business_id = NULLIF(current_setting('app.business_id', true), '')
        AND (
            user_id IS NULL
            OR user_id = NULLIF(current_setting('app.user_id', true), '')
            OR elektrix_is_staff()
        )
    );

DROP POLICY IF EXISTS tenant_isolation_cart_items ON cart_items;
CREATE POLICY tenant_isolation_cart_items ON cart_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM carts c
            WHERE c.id = cart_items.cart_id
              AND c.business_id = NULLIF(current_setting('app.business_id', true), '')
              AND (
                c.user_id IS NULL
                OR c.user_id = NULLIF(current_setting('app.user_id', true), '')
                OR elektrix_is_staff()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM carts c
            WHERE c.id = cart_items.cart_id
              AND c.business_id = NULLIF(current_setting('app.business_id', true), '')
              AND (
                c.user_id IS NULL
                OR c.user_id = NULLIF(current_setting('app.user_id', true), '')
                OR elektrix_is_staff()
              )
        )
    );

-- ---------------------------------------------------------------------------
-- Grant table access for the new tables to the app role
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory, inventory_movements, addresses,
    wishlist_items, notifications, newsletter_subscribers TO emivo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO emivo_app;
