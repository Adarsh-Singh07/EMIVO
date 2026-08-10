-- Carts RLS Policy
-- FORCE ROW LEVEL SECURITY required for Supabase (postgres role has BYPASSRLS=true)
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_carts ON public.carts;
CREATE POLICY tenant_isolation_carts ON public.carts
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text)
    WITH CHECK (business_id = NULLIF(current_setting('app.business_id', true), '')::text);

DROP POLICY IF EXISTS tenant_isolation_cart_items ON public.cart_items;
CREATE POLICY tenant_isolation_cart_items ON public.cart_items
    FOR ALL
    USING (
        cart_id IN (
            SELECT id FROM public.carts
            WHERE business_id = NULLIF(current_setting('app.business_id', true), '')::text
        )
    )
    WITH CHECK (
        cart_id IN (
            SELECT id FROM public.carts
            WHERE business_id = NULLIF(current_setting('app.business_id', true), '')::text
        )
    );
