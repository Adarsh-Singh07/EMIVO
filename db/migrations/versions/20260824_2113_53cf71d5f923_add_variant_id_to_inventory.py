"""Add variant_id to inventory

Revision ID: 53cf71d5f923
Revises: 32c9f3437266
Create Date: 2026-08-24 21:13:27.710632

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '53cf71d5f923'
down_revision: Union[str, None] = '32c9f3437266'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Drop unique constraint on product_id
    op.drop_constraint('uq_inventory_product', 'inventory', type_='unique')
    # Create index on product_id
    op.create_index('ix_inventory_product_id', 'inventory', ['product_id'], unique=False)
    # Create unique constraint on variant_id
    op.create_unique_constraint('uq_inventory_variant_id', 'inventory', ['variant_id'])

def downgrade() -> None:
    op.drop_constraint('uq_inventory_variant_id', 'inventory', type_='unique')
    op.drop_index('ix_inventory_product_id', table_name='inventory')
    op.create_unique_constraint('uq_inventory_product', 'inventory', ['product_id'])
