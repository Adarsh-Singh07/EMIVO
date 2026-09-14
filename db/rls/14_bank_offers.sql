-- Bank offers RLS (idempotent; same policies as the 20260914_1400 migration)
-- Public read: offers are storefront merchandising content.
-- Writes: tenant-scoped via the app.business_id GUC bound by set_db_context.
ALTER TABLE bank_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_offers FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_offers_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_offers_products FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_offers_public_read ON bank_offers;
CREATE POLICY bank_offers_public_read ON bank_offers
    FOR SELECT TO emivo_app USING (true);

DROP POLICY IF EXISTS bank_offers_tenant_write ON bank_offers;
CREATE POLICY bank_offers_tenant_write ON bank_offers
    FOR ALL TO emivo_app
    USING (business_id::text = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK (business_id::text = NULLIF(current_setting('app.business_id', true), ''));

DROP POLICY IF EXISTS bank_offers_products_public_read ON bank_offers_products;
CREATE POLICY bank_offers_products_public_read ON bank_offers_products
    FOR SELECT TO emivo_app USING (true);

DROP POLICY IF EXISTS bank_offers_products_tenant_write ON bank_offers_products;
CREATE POLICY bank_offers_products_tenant_write ON bank_offers_products
    FOR ALL TO emivo_app
    USING (business_id::text = NULLIF(current_setting('app.business_id', true), ''))
    WITH CHECK (business_id::text = NULLIF(current_setting('app.business_id', true), ''));

DO $$ BEGIN
    GRANT SELECT, INSERT, UPDATE, DELETE ON bank_offers TO emivo_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON bank_offers_products TO emivo_app;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
