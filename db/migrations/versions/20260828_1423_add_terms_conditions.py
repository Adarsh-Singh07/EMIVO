"""add_terms_conditions

Revision ID: 20260828_1423
Revises: 20260828_1422
Create Date: 2026-08-28 14:23:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '20260828_1423'
down_revision = '20260828_1422'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c['name'] for c in inspector.get_columns('coupons')]
    if 'terms_conditions' not in columns:
        op.add_column('coupons', sa.Column('terms_conditions', sa.String(), nullable=True))

def downgrade():
    op.drop_column('coupons', 'terms_conditions')
