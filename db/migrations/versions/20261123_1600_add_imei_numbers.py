"""Add imei_numbers to order_items.

Revision ID: 20261123_1600
Revises: 20261123_1400
Create Date: 2026-11-23 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261123_1600"
down_revision: Union[str, None] = "20261123_1400"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    statements = [
        "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS imei_numbers JSONB DEFAULT '[]'::jsonb",
    ]
    for stmt in statements:
        try:
            op.execute(stmt)
        except Exception:
            pass


def downgrade() -> None:
    pass
