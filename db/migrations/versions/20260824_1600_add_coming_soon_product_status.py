"""Add COMING_SOON product status

Revision ID: 305e70d381fc
Revises: add_phone_to_users
Create Date: 2026-08-24 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '305e70d381fc'
down_revision: Union[str, None] = '999999999999'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add COMING_SOON to ProductStatus enum
    op.execute("ALTER TYPE productstatus ADD VALUE IF NOT EXISTS 'COMING_SOON'")

def downgrade() -> None:
    pass
