"""Allow staff/admin to view customer addresses under RLS.

Revision ID: 20261122_1500
Revises: 20261121_2000
Create Date: 2026-11-22 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "20261122_1500"
down_revision: Union[str, None] = "20261121_2000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    statements = [
        "DROP POLICY IF EXISTS addresses_owner ON addresses",
        """CREATE POLICY addresses_owner ON addresses
        FOR ALL
        USING (user_id = NULLIF(current_setting('app.user_id', true), '') OR elektrix_is_staff())
        WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '') OR elektrix_is_staff())""",
    ]
    for stmt in statements:
        try:
            op.execute(stmt)
        except Exception:
            pass


def downgrade() -> None:
    pass
