"""product reviews + RLS

Revision ID: 20260914_1200
Revises: 20260914_1000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '20260914_1200'
down_revision = '20260914_1000'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    if 'product_reviews' not in tables:
        stmts = [
            """CREATE TABLE product_reviews (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                title VARCHAR(120),
                body TEXT,
                verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_product_reviews_user_product UNIQUE (user_id, product_id)
            )""",
            "CREATE INDEX ix_product_reviews_product ON product_reviews(product_id)",
            "CREATE INDEX ix_product_reviews_user ON product_reviews(user_id)",
        ]
    else:
        stmts = []
    # RLS — public read (reviews are storefront content), owner-scoped writes.
    stmts += [
        "ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE product_reviews FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS product_reviews_public_read ON product_reviews",
        "CREATE POLICY product_reviews_public_read ON product_reviews FOR SELECT USING (true)",
        "DROP POLICY IF EXISTS product_reviews_owner_write ON product_reviews",
        """CREATE POLICY product_reviews_owner_write ON product_reviews FOR ALL
            USING ((user_id)::text = NULLIF(current_setting('app.user_id', true), ''))
            WITH CHECK ((user_id)::text = NULLIF(current_setting('app.user_id', true), ''))""",
        # Defensive grant (role may not exist in fresh test envs yet)
        "GRANT SELECT, INSERT, UPDATE, DELETE ON product_reviews TO emivo_app",
    ]
    for s in stmts:
        conn.execute(sa.text(s))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    if 'product_reviews' in inspector.get_table_names():
        conn.execute(sa.text("DROP TABLE product_reviews CASCADE"))
