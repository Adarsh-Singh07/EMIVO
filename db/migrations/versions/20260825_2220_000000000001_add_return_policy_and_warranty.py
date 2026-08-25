"""add return_policy and warranty_info to products

Revision ID: 000000000001
Revises: 46a1e8a5a2f2
Create Date: 2026-08-25 22:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '000000000001'
down_revision: Union[str, None] = '46a1e8a5a2f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('products', sa.Column('return_policy', sa.String(length=255), nullable=True))
    op.add_column('products', sa.Column('warranty_info', sa.String(length=255), nullable=True))
    op.add_column('categories', sa.Column('icon', sa.String(length=255), nullable=True))
    op.add_column('categories', sa.Column('keywords', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'warranty_info')
    op.drop_column('products', 'return_policy')
    op.drop_column('categories', 'keywords')
    op.drop_column('categories', 'icon')
