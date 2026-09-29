-- Admin AI assistant audit log (idempotent; mirrors the 20260929_2000 migration)
-- admin_ai_actions is a staff-only, business-agnostic audit trail written by
-- the app role (emivo_app) from the admin assistant service. Prod enables RLS
-- on it (no default-allow), so staff must get an explicit policy — the audit
-- INSERT otherwise fails with "new row violates row-level security policy".
ALTER TABLE public.admin_ai_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_ai_staff_all ON public.admin_ai_actions;
CREATE POLICY admin_ai_staff_all ON public.admin_ai_actions
    FOR ALL TO emivo_app
    USING (
        NULLIF(current_setting('app.role', true), '') IN ('platform_admin', 'owner', 'staff')
    )
    WITH CHECK (
        NULLIF(current_setting('app.role', true), '') IN ('platform_admin', 'owner', 'staff')
    );

DO $$ BEGIN
    GRANT SELECT, INSERT ON public.admin_ai_actions TO emivo_app;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
