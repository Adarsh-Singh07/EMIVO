-- RLS Policy for payments table
-- Enable and Force RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

-- Grant permissions to emivo_app role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO emivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_events TO emivo_app;

-- Drop old policies
DROP POLICY IF EXISTS "Tenant isolation for payments" ON public.payments;

-- Create tenant isolation policy
CREATE POLICY "Tenant isolation for payments" ON public.payments
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text);
