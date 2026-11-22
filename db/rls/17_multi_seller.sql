-- Multi-seller and Catalog Governance RLS & Grants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO emivo_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO emivo_app;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO emivo_app;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_listings') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_listings TO emivo_app;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalog_duplicate_candidates') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_duplicate_candidates TO emivo_app;
        END IF;
    END IF;
END $$;

-- Catalog duplicate candidates: app role unrestricted access for governance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalog_duplicate_candidates') THEN
        ALTER TABLE public.catalog_duplicate_candidates ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS catalog_duplicates_all ON public.catalog_duplicate_candidates;
        CREATE POLICY catalog_duplicates_all ON public.catalog_duplicate_candidates
            FOR ALL TO emivo_app
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
