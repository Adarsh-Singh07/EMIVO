"""support tickets (Service-Desk style) + RLS

Revision ID: 20260914_1000
Revises: 20260913_2000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '20260914_1000'
down_revision = '20260913_2000'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    if 'support_tickets' not in tables:
        stmts = [
            """CREATE TABLE support_tickets (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id),
                order_id VARCHAR(36),
                order_number VARCHAR(30),
                category VARCHAR(30) NOT NULL,
                subject VARCHAR(200) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )""",
            "CREATE INDEX ix_support_tickets_user ON support_tickets(user_id)",
            """CREATE TABLE support_ticket_messages (
                id VARCHAR(36) PRIMARY KEY,
                ticket_id VARCHAR(36) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
                sender VARCHAR(10) NOT NULL,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )""",
            "CREATE INDEX ix_support_ticket_messages_ticket ON support_ticket_messages(ticket_id)",
        ]
    else:
        stmts = []
    # RLS statements — one execute per statement (asyncpg rejects multi-statement)
    stmts += [
        "ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS support_tickets_select ON support_tickets",
        """CREATE POLICY support_tickets_select ON support_tickets FOR SELECT
            USING ((user_id)::text = NULLIF(current_setting('app.user_id', true), '')
                   OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))""",
        "DROP POLICY IF EXISTS support_tickets_modify ON support_tickets",
        """CREATE POLICY support_tickets_modify ON support_tickets FOR ALL
            USING ((user_id)::text = NULLIF(current_setting('app.user_id', true), '')
                   OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))
            WITH CHECK ((user_id)::text = NULLIF(current_setting('app.user_id', true), '')
                   OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))""",
        "ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE support_ticket_messages FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS stm_select ON support_ticket_messages",
        """CREATE POLICY stm_select ON support_ticket_messages FOR SELECT
            USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id
                   AND ((t.user_id)::text = NULLIF(current_setting('app.user_id', true), '')
                   OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))))""",
        "DROP POLICY IF EXISTS stm_modify ON support_ticket_messages",
        """CREATE POLICY stm_modify ON support_ticket_messages FOR ALL
            USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id
                   AND ((t.user_id)::text = NULLIF(current_setting('app.user_id', true), '')
                   OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))))
            WITH CHECK (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id
                   AND ((t.user_id)::text = NULLIF(current_setting('app.user_id', true), '')
                   OR NULLIF(current_setting('app.role', true), '') IN ('staff', 'owner', 'platform_admin'))))""",
        # Grants are defensive: the emivo_app role may not exist yet when
        # migrations run (test env creates it in the RLS step after this).
        """DO $$ BEGIN
            GRANT SELECT, INSERT, UPDATE ON support_tickets TO emivo_app;
            GRANT SELECT, INSERT ON support_ticket_messages TO emivo_app;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;"""
    ]
    for stmt in stmts:
        op.execute(stmt)


def downgrade():
    op.execute("DROP TABLE IF EXISTS support_ticket_messages; DROP TABLE IF EXISTS support_tickets;")
