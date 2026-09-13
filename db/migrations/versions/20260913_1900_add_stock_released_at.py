"""payment retry window: orders.stock_released_at

Revision ID: 20260913_1900
Revises: 20260828_1423
Create Date: 2026-09-13 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '20260913_1900'
down_revision = '20260828_1423'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c['name'] for c in inspector.get_columns('orders')]
    if 'stock_released_at' not in columns:
        op.add_column('orders', sa.Column('stock_released_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('orders', 'stock_released_at')
