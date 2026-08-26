GRANT ALL PRIVILEGES ON TABLE product_catalogues TO emivo_app;
ALTER TABLE product_catalogues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_product_catalogues" ON product_catalogues;
CREATE POLICY "tenant_isolation_product_catalogues" ON product_catalogues
    FOR ALL
    TO emivo_app
    USING (
        business_id::text = current_setting('app.business_id', true)
        OR current_setting('app.business_id', true) IS NULL
    );
