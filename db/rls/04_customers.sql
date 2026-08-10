-- Row Level Security for customers table
-- FORCE ROW LEVEL SECURITY ensures it applies even to the table owner/superuser (required for Supabase)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for customers" ON public.customers;

CREATE POLICY "Tenant isolation for customers"
    ON public.customers
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text);
