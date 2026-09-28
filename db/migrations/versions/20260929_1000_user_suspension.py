"""user account suspension (admin moderation)

Revision ID: 20260929_1000
Revises: 20260914_1600
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '20260929_1000'
down_revision = '20260914_1600'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    cols = {c["name"] for c in inspector.get_columns("users")}

    if "suspended" not in cols:
        op.add_column("users", sa.Column("suspended", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "suspension_reason" not in cols:
        op.add_column("users", sa.Column("suspension_reason", sa.Text(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    cols = {c["name"] for c in inspector.get_columns("users")}
    if "suspension_reason" in cols:
        op.drop_column("users", "suspension_reason")
    if "suspended" in cols:
        op.drop_column("users", "suspended")
