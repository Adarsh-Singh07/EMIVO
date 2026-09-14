"""staff-only order notes timeline + RLS

Revision ID: 20260914_1600
Revises: 20260914_1400
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '20260914_1600'
down_revision = '20260914_1400'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    stmts = []
    if 'order_notes' not in tables:
        stmts += [
            """CREATE TABLE order_notes (
                id VARCHAR(36) PRIMARY KEY,
                order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                business_id VARCHAR(36) NOT NULL,
                author_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )""",
            "CREATE INDEX ix_order_notes_order ON order_notes(order_id)",
        ]

    # Staff-only RLS: NULLIF(current_setting('app.role', true), '') IN ('platform_admin', 'owner', 'staff') reads app.role, so customer and
    # anonymous sessions see nothing even though orders themselves are
    # readable by their owners.
    stmts += [
        "ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE order_notes FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS order_notes_staff_all ON order_notes",
        """CREATE POLICY order_notes_staff_all ON order_notes FOR ALL
            USING (
                NULLIF(current_setting('app.role', true), '') IN ('platform_admin', 'owner', 'staff')
                AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
            )
            WITH CHECK (
                NULLIF(current_setting('app.role', true), '') IN ('platform_admin', 'owner', 'staff')
                AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
            )""",
        """DO $$ BEGIN
            GRANT SELECT, INSERT, UPDATE, DELETE ON order_notes TO emivo_app;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;""",
    ]

    for s in stmts:
        conn.execute(sa.text(s))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    if 'order_notes' in inspector.get_table_names():
        conn.execute(sa.text("DROP TABLE order_notes CASCADE"))
