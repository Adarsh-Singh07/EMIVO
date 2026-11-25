-- Multi-seller and Catalog Governance RLS & Grants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO emivo_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO emivo_app;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO emivo_app;
            ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS sellers_all ON public.sellers;
            CREATE POLICY sellers_all ON public.sellers
                FOR ALL TO emivo_app
                USING (true)
                WITH CHECK (true);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_listings') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_listings TO emivo_app;
            ALTER TABLE public.seller_listings ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS seller_listings_all ON public.seller_listings;
            CREATE POLICY seller_listings_all ON public.seller_listings
                FOR ALL TO emivo_app
                USING (true)
                WITH CHECK (true);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalog_duplicate_candidates') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_duplicate_candidates TO emivo_app;
            ALTER TABLE public.catalog_duplicate_candidates ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS catalog_duplicates_all ON public.catalog_duplicate_candidates;
            CREATE POLICY catalog_duplicates_all ON public.catalog_duplicate_candidates
                FOR ALL TO emivo_app
                USING (true)
                WITH CHECK (true);
        END IF;

        -- RLS helper functions: policies call these, so the app role needs
        -- EXECUTE on them. Granted here (not only in the migration) because
        -- in CI the role is created *after* `alembic upgrade head`.
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'elektrix_current_seller') THEN
            GRANT EXECUTE ON FUNCTION public.elektrix_current_seller() TO emivo_app;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'elektrix_seller_owns_item') THEN
            GRANT EXECUTE ON FUNCTION public.elektrix_seller_owns_item(text) TO emivo_app;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'elektrix_seller_owns_order') THEN
            GRANT EXECUTE ON FUNCTION public.elektrix_seller_owns_order(text) TO emivo_app;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'elektrix_is_staff') THEN
            GRANT EXECUTE ON FUNCTION public.elektrix_is_staff() TO emivo_app;
        END IF;
    END IF;
END $$;
