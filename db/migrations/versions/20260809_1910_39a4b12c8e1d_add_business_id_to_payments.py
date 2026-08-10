"""add_business_id_to_payments

Revision ID: 39a4b12c8e1d
Revises: 20260809_1842_266616b0d24c
Create Date: 2026-08-09 19:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '39a4b12c8e1d'
down_revision = '266616b0d24c'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('payments', sa.Column('business_id', sa.String(length=36), nullable=False))
    op.create_index(op.f('ix_payments_business_id'), 'payments', ['business_id'], unique=False)
    op.create_foreign_key('fk_payments_business_id', 'payments', 'businesses', ['business_id'], ['id'], ondelete='CASCADE')


def downgrade():
    op.drop_constraint('fk_payments_business_id', 'payments', type_='foreignkey')
    op.drop_index(op.f('ix_payments_business_id'), table_name='payments')
    op.drop_column('payments', 'business_id')
