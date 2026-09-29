-- Admin AI assistant audit log (idempotent; mirrors the 20260929_2000 migration)
-- admin_ai_actions is a staff-only, business-agnostic audit trail. It is
-- written by the app role (emivo_app) from the admin assistant service. No
-- RLS is enabled on it (an RLS policy would block the audit INSERT, which runs
-- without a matching business context); access is controlled at the API layer
-- (require_staff) + the GRANT below.
DO $$ BEGIN
    GRANT SELECT, INSERT ON public.admin_ai_actions TO emivo_app;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
