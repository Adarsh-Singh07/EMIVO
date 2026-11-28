-- Return Requests RLS & App Role Grants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'return_requests') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_requests TO emivo_app;
        END IF;
    END IF;
END $$;

ALTER TABLE IF EXISTS public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.return_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_requests_staff_all" ON public.return_requests;
CREATE POLICY "return_requests_staff_all" ON public.return_requests
FOR ALL
USING (
    public.elektrix_is_staff()
    AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
)
WITH CHECK (
    public.elektrix_is_staff()
    AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
);

DROP POLICY IF EXISTS "return_requests_customer_read" ON public.return_requests;
CREATE POLICY "return_requests_customer_read" ON public.return_requests
FOR SELECT
USING (
    user_id::text = NULLIF(current_setting('app.user_id', true), '')
    AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
);

DROP POLICY IF EXISTS "return_requests_customer_insert" ON public.return_requests;
CREATE POLICY "return_requests_customer_insert" ON public.return_requests
FOR INSERT
WITH CHECK (
    user_id::text = NULLIF(current_setting('app.user_id', true), '')
    AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
);

DROP POLICY IF EXISTS "return_requests_seller_read" ON public.return_requests;
CREATE POLICY "return_requests_seller_read" ON public.return_requests
FOR SELECT
USING (
    public.elektrix_current_seller() IS NOT NULL
    AND seller_id::text = public.elektrix_current_seller()
);
