-- Coupons RLS Policy
-- FORCE ROW LEVEL SECURITY required for Supabase (postgres role has BYPASSRLS=true)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_coupons ON public.coupons;
CREATE POLICY tenant_isolation_coupons ON public.coupons
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text)
    WITH CHECK (business_id = NULLIF(current_setting('app.business_id', true), '')::text);

DROP POLICY IF EXISTS tenant_isolation_coupon_usages ON public.coupon_usages;
CREATE POLICY tenant_isolation_coupon_usages ON public.coupon_usages
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text)
    WITH CHECK (business_id = NULLIF(current_setting('app.business_id', true), '')::text);
