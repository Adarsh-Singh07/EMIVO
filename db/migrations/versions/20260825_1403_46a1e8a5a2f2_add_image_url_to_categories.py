"""Add image_url to categories

Revision ID: 46a1e8a5a2f2
Revises: 53cf71d5f923
Create Date: 2026-08-25 14:03:05.034071

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '46a1e8a5a2f2'
down_revision: Union[str, None] = '53cf71d5f923'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('image_url', sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column('categories', 'image_url')
