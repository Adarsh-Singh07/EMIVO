-- Products RLS Policy
-- FORCE ROW LEVEL SECURITY ensures it applies even to the table owner/superuser (required for Supabase)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Products
-- Two policies:
--   1. Tenant-scoped write/management (when business_id IS set)
--   2. Public storefront read (when no business_id is set — anonymous browsing)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Tenant isolation for products" ON public.products;
DROP POLICY IF EXISTS "Public read for products" ON public.products;

-- Authenticated staff/owner: full access scoped to their business
CREATE POLICY "Tenant isolation for products"
    ON public.products
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text);

-- Unauthenticated storefront: read-only access to all products
CREATE POLICY "Public read for products"
    ON public.products
    FOR SELECT
    USING (NULLIF(current_setting('app.business_id', true), '') IS NULL);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Tenant isolation for categories" ON public.categories;
DROP POLICY IF EXISTS "Public read for categories" ON public.categories;

CREATE POLICY "Tenant isolation for categories"
    ON public.categories
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text);

CREATE POLICY "Public read for categories"
    ON public.categories
    FOR SELECT
    USING (NULLIF(current_setting('app.business_id', true), '') IS NULL);

-- ---------------------------------------------------------------------------
-- Product variants (inherit from product)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Tenant isolation for product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Public read for product_variants" ON public.product_variants;

CREATE POLICY "Tenant isolation for product_variants"
    ON public.product_variants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_variants.product_id
            AND business_id = NULLIF(current_setting('app.business_id', true), '')::text
        )
    );

CREATE POLICY "Public read for product_variants"
    ON public.product_variants
    FOR SELECT
    USING (
        NULLIF(current_setting('app.business_id', true), '') IS NULL
    );

-- ---------------------------------------------------------------------------
-- Product media (inherit from product)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Tenant isolation for product_media" ON public.product_media;
DROP POLICY IF EXISTS "Public read for product_media" ON public.product_media;

CREATE POLICY "Tenant isolation for product_media"
    ON public.product_media
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_media.product_id
            AND business_id = NULLIF(current_setting('app.business_id', true), '')::text
        )
    );

CREATE POLICY "Public read for product_media"
    ON public.product_media
    FOR SELECT
    USING (
        NULLIF(current_setting('app.business_id', true), '') IS NULL
    );
