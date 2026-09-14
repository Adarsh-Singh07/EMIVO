"""bank offers + product eligibility join + RLS

Revision ID: 20260914_1400
Revises: 20260914_1200
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '20260914_1400'
down_revision = '20260914_1200'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    stmts = []
    if 'bank_offers' not in tables:
        stmts += [
            """CREATE TABLE bank_offers (
                id VARCHAR(36) PRIMARY KEY,
                business_id VARCHAR(36) NOT NULL,
                bank_name VARCHAR(80) NOT NULL,
                card_type VARCHAR(20) NOT NULL DEFAULT 'ALL',
                discount_text VARCHAR(200) NOT NULL,
                poster_url TEXT,
                link VARCHAR(500),
                starts_at TIMESTAMPTZ,
                ends_at TIMESTAMPTZ,
                position INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )""",
            "CREATE INDEX ix_bank_offers_business ON bank_offers(business_id)",
        ]
    if 'bank_offers_products' not in tables:
        stmts += [
            """CREATE TABLE bank_offers_products (
                bank_offer_id VARCHAR(36) NOT NULL REFERENCES bank_offers(id) ON DELETE CASCADE,
                product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                business_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT pk_bank_offers_products PRIMARY KEY (bank_offer_id, product_id)
            )""",
            "CREATE INDEX ix_bank_offers_products_product ON bank_offers_products(product_id)",
            "CREATE INDEX ix_bank_offers_products_business ON bank_offers_products(business_id)",
        ]

    # RLS — public read (storefront merchandising content), tenant-scoped
    # writes. Policies are created WITHOUT a TO role here because the test
    # harness runs migrations before emivo_app exists; db/rls/14_bank_offers.sql
    # re-creates them role-scoped once the role is present.
    for table in ('bank_offers', 'bank_offers_products'):
        stmts += [
            f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY",
            f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
            f"DROP POLICY IF EXISTS {table}_public_read ON {table}",
            f"CREATE POLICY {table}_public_read ON {table} FOR SELECT USING (true)",
            f"DROP POLICY IF EXISTS {table}_tenant_write ON {table}",
            f"""CREATE POLICY {table}_tenant_write ON {table} FOR ALL
                USING (business_id::text = NULLIF(current_setting('app.business_id', true), ''))
                WITH CHECK (business_id::text = NULLIF(current_setting('app.business_id', true), ''))""",
            # Grants are defensive: the emivo_app role may not exist yet when
            # migrations run (test env creates it in the RLS step after this).
            f"""DO $$ BEGIN
                GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO emivo_app;
            EXCEPTION WHEN OTHERS THEN NULL; END $$;""",
        ]

    for s in stmts:
        conn.execute(sa.text(s))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    # bank_offers_products goes first via its own drop (it also cascades from
    # bank_offers, but dropping it explicitly keeps downgrade order obvious).
    if 'bank_offers_products' in tables:
        conn.execute(sa.text("DROP TABLE bank_offers_products CASCADE"))
    if 'bank_offers' in tables:
        conn.execute(sa.text("DROP TABLE bank_offers CASCADE"))
