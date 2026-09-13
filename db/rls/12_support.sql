-- Support tickets: policies + grants (idempotent complement to the alembic
-- migration; kept here so prod RLS application stays in one place).
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_tickets_select ON support_tickets;
CREATE POLICY support_tickets_select ON support_tickets FOR SELECT
    USING ((user_id)::text = NULLIF(current_setting('app.user_id', true), '')
           OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'));
DROP POLICY IF EXISTS support_tickets_modify ON support_tickets;
CREATE POLICY support_tickets_modify ON support_tickets FOR ALL
    USING ((user_id)::text = NULLIF(current_setting('app.user_id', true), '')
           OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))
    WITH CHECK ((user_id)::text = NULLIF(current_setting('app.user_id', true), '')
           OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'));
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stm_select ON support_ticket_messages;
CREATE POLICY stm_select ON support_ticket_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id
           AND ((t.user_id)::text = NULLIF(current_setting('app.user_id', true), '')
           OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))));
DROP POLICY IF EXISTS stm_modify ON support_ticket_messages;
CREATE POLICY stm_modify ON support_ticket_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id
           AND ((t.user_id)::text = NULLIF(current_setting('app.user_id', true), '')
           OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))))
    WITH CHECK (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id
           AND ((t.user_id)::text = NULLIF(current_setting('app.user_id', true), '')
           OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))));
GRANT SELECT, INSERT, UPDATE ON support_tickets TO emivo_app;
GRANT SELECT, INSERT ON support_ticket_messages TO emivo_app;
