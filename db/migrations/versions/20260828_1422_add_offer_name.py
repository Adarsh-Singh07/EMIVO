"""add_offer_name

Revision ID: 20260828_1422
Revises: 20260826_1900
Create Date: 2026-08-28 14:22:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '20260828_1422'
down_revision = "20260826_1900"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c['name'] for c in inspector.get_columns('products')]
    if 'offer_name' not in columns:
        op.add_column('products', sa.Column('offer_name', sa.String(length=255), nullable=True))

def downgrade():
    op.drop_column('products', 'offer_name')
