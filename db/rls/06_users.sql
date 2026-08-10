-- Users Table RLS Policies
-- FORCE ROW LEVEL SECURITY ensures policies apply even to the table owner/superuser (required for Supabase postgres role)
-- Note: The postgres role has BYPASSRLS=true, so we connect then SET ROLE emivo_app (which has NOBYPASSRLS).

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Remove old blanket ALL policy
DROP POLICY IF EXISTS tenant_isolation_users ON public.users;
DROP POLICY IF EXISTS users_insert_policy ON public.users;
DROP POLICY IF EXISTS users_select_policy ON public.users;
DROP POLICY IF EXISTS users_update_policy ON public.users;
DROP POLICY IF EXISTS users_delete_policy ON public.users;

-- INSERT: Allow freely for registration (no user context available yet)
CREATE POLICY users_insert_policy
    ON public.users
    FOR INSERT
    WITH CHECK (true);

-- SELECT: Allow unrestricted read (needed for login lookup by email, JWT validation)
-- Row-level access control is enforced at the service layer via JWT
CREATE POLICY users_select_policy
    ON public.users
    FOR SELECT
    USING (true);

-- UPDATE: Only own record
CREATE POLICY users_update_policy
    ON public.users
    FOR UPDATE
    USING ((id)::text = NULLIF(current_setting('app.user_id', true), ''))
    WITH CHECK ((id)::text = NULLIF(current_setting('app.user_id', true), ''));

-- DELETE: Deny all (soft-delete via is_active flag)
CREATE POLICY users_delete_policy
    ON public.users
    FOR DELETE
    USING (false);
