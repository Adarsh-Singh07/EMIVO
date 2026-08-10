-- Business Settings RLS Policies
-- FORCE ROW LEVEL SECURITY required for Supabase (postgres role has BYPASSRLS=true)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business settings" ON public.business_settings;
CREATE POLICY "Users can view their business settings"
    ON public.business_settings
    FOR SELECT
    USING (
        business_id = NULLIF(current_setting('app.business_id', true), '')::text
    );

DROP POLICY IF EXISTS "Users can manage their business settings" ON public.business_settings;
CREATE POLICY "Users can manage their business settings"
    ON public.business_settings
    FOR ALL
    USING (
        business_id = NULLIF(current_setting('app.business_id', true), '')::text
    )
    WITH CHECK (
        business_id = NULLIF(current_setting('app.business_id', true), '')::text
    );
