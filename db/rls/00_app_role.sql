-- EMIVO Application Role Setup
-- 
-- Context: The Supabase 'postgres' role has BYPASSRLS=true and cannot be changed.
-- Even FORCE ROW LEVEL SECURITY does not enforce policies for BYPASSRLS roles.
--
-- Solution: Create 'emivo_app' (NOBYPASSRLS) and grant it table access.
-- The application connects as 'postgres' then immediately runs:
--   SET LOCAL ROLE emivo_app
-- in get_db_session(), so all queries run as emivo_app with RLS enforced.
--
-- This script is idempotent and safe to run multiple times.

-- Create restricted app role (no BYPASSRLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
        CREATE ROLE emivo_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
    END IF;
END
$$;

-- Allow postgres to switch to emivo_app
GRANT emivo_app TO postgres;

-- Grant full table access to emivo_app
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_media TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_events TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_usages TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbox_events TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alembic_version TO emivo_app;

-- Grant sequence usage for auto-increment/UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO emivo_app;
