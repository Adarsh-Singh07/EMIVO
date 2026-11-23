"""Add invoice fields, serial_numbers and fulfillment_type on orders and order_items.

Revision ID: 20261123_1400
Revises: 20261123_1000
Create Date: 2026-11-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261123_1400"
down_revision: Union[str, None] = "20261123_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    statements = [
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_invoice_url TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD'",
        "CREATE INDEX IF NOT EXISTS ix_orders_invoice_number ON orders(invoice_number) WHERE invoice_number IS NOT NULL",
        "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS serial_numbers JSONB DEFAULT '[]'::jsonb",
        "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT '8517'",
    ]
    for stmt in statements:
        try:
            op.execute(stmt)
        except Exception:
            pass


def downgrade() -> None:
    pass
