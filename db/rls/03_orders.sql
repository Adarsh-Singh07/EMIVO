-- Orders RLS Policy
-- FORCE ROW LEVEL SECURITY required for Supabase (postgres role has BYPASSRLS=true)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for orders" ON public.orders;
CREATE POLICY "Tenant isolation for orders"
    ON public.orders
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text);

DROP POLICY IF EXISTS "Tenant isolation for order_items" ON public.order_items;
CREATE POLICY "Tenant isolation for order_items"
    ON public.order_items
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id
        AND o.business_id = NULLIF(current_setting('app.business_id', true), '')::text
    ));
