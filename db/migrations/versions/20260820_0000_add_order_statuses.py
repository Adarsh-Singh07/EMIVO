"""add packed, out_for_delivery, payment_failed, payment_pending order statuses

Revision ID: a1b2c3d4e5f6
Revises: 5a7b8c9d0e1f
Create Date: 2026-08-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '5a7b8c9d0e1f'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add new values to orderstatus enum
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PACKED'")
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY'")
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED'")
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING'")

def downgrade() -> None:
    # Downgrading enums in PG is tricky, we can just leave them
    pass