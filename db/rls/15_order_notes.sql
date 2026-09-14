-- Order notes RLS (idempotent; same policies as the 20260914_1600 migration)
-- Staff-only: elektrix_is_staff() evaluates app.role, so customer and
-- anonymous sessions see nothing.
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_notes_staff_all ON order_notes;
CREATE POLICY order_notes_staff_all ON order_notes
    FOR ALL TO emivo_app
    USING (
        elektrix_is_staff()
        AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
    )
    WITH CHECK (
        elektrix_is_staff()
        AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
    );

DO $$ BEGIN
    GRANT SELECT, INSERT, UPDATE, DELETE ON order_notes TO emivo_app;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
