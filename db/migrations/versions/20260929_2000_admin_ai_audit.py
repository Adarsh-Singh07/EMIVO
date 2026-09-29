"""admin AI assistant audit log

Revision ID: 20260929_2000
Revises: 20260929_1000
"""
from alembic import op
from sqlalchemy.engine.reflection import Inspector

revision = '20260929_2000'
down_revision = '20260929_1000'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    if 'admin_ai_actions' not in tables:
        from sqlalchemy import (
            text as sqltext,
        )
        conn.execute(sqltext("""
            CREATE TABLE public.admin_ai_actions (
                id            CHAR(32) PRIMARY KEY,
                admin_id      CHAR(36) NOT NULL,
                question      TEXT NOT NULL,
                tools         JSONB NOT NULL DEFAULT '[]',
                model         TEXT NOT NULL DEFAULT '',
                outcome       TEXT NOT NULL DEFAULT 'ok',
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        conn.execute(sqltext("CREATE INDEX ix_admin_ai_actions_admin ON public.admin_ai_actions (admin_id, created_at DESC)"))
        # Defensive: the emivo_app role may not exist yet when migrations run
        # (test env creates it later in the RLS step).
        conn.execute(sqltext("""DO $$ BEGIN
            GRANT SELECT, INSERT ON public.admin_ai_actions TO emivo_app;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;"""))
        conn.execute(sqltext("COMMENT ON TABLE public.admin_ai_actions IS 'Audit log of admin assistant turns (who, what tools, which model)'"))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    if 'admin_ai_actions' in inspector.get_table_names():
        from sqlalchemy import text as sqltext
        conn.execute(sqltext("DROP TABLE public.admin_ai_actions"))
