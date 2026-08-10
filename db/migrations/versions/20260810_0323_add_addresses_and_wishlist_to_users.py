"""add_addresses_and_wishlist_to_users

Revision ID: 40a4b12c8e1d
Revises: 39a4b12c8e1d
Create Date: 2026-08-10 03:23:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '40a4b12c8e1d'
down_revision = '39a4b12c8e1d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('addresses', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('users', sa.Column('wishlist', sa.JSON(), nullable=True, server_default='[]'))


def downgrade():
    op.drop_column('users', 'wishlist')
    op.drop_column('users', 'addresses')
