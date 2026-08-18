"""add payment status

Revision ID: 5a7b8c9d0e1f
Revises: f02a71c9b3de
Create Date: 2026-08-17 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '5a7b8c9d0e1f'
down_revision = 'f02a71c9b3de'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add CREATED and EXPIRED to paymentstatus enum
    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'CREATED'")
    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'EXPIRED'")
    
    # Also CASHFREE to paymentprovider just in case
    op.execute("ALTER TYPE paymentprovider ADD VALUE IF NOT EXISTS 'CASHFREE'")

def downgrade() -> None:
    # Downgrading enums in PG is tricky, we can just leave them
    pass
