-- Product reviews RLS (idempotent; same policies as the 20260914_1200 migration)
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_reviews_public_read ON product_reviews;
CREATE POLICY product_reviews_public_read ON product_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS product_reviews_owner_write ON product_reviews;
CREATE POLICY product_reviews_owner_write ON product_reviews
    FOR ALL
    USING ((user_id)::text = NULLIF(current_setting('app.user_id', true), ''))
    WITH CHECK ((user_id)::text = NULLIF(current_setting('app.user_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON product_reviews TO emivo_app;
