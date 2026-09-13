"""registration phone uniqueness + flash-sale flag

Revision ID: 20260913_2000
Revises: 20260913_1900
Create Date: 2026-09-13 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '20260913_2000'
down_revision = '20260913_1900'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    # One mobile number = one account, ever (soft-deleted accounts included —
    # reuse requires contacting support). Existing users keep NULL phone
    # until they add one via profile.
    indexes = [i['name'] for i in inspector.get_indexes('users')]
    if 'uq_users_phone' not in indexes:
        op.create_index(
            'uq_users_phone', 'users', ['phone'],
            unique=True, postgresql_where=sa.text('phone IS NOT NULL'),
        )

    columns = [c['name'] for c in inspector.get_columns('products')]
    if 'is_flash_sale' not in columns:
        op.add_column('products', sa.Column(
            'is_flash_sale', sa.Boolean(), nullable=False, server_default='false',
        ))


def downgrade():
    op.drop_column('products', 'is_flash_sale')
    op.drop_index('uq_users_phone', table_name='users')
