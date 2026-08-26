"""add product_catalogues table

Revision ID: 20260826_1900
Revises: 20260825_2220_000000000001_add_return_policy_and_warranty
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260826_1900"
down_revision = "000000000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_catalogues",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("eyebrow", sa.String(100), nullable=True, server_default="FEATURED"),
        sa.Column("subtitle", sa.String(500), nullable=True),
        sa.Column("category_link", sa.String(500), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_homepage", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("product_ids", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), onupdate=sa.text("now()")),
    )
    op.create_index("ix_product_catalogues_business_id", "product_catalogues", ["business_id"])

    # Enable RLS
    op.execute("ALTER TABLE product_catalogues ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "Tenant isolation for product_catalogues"
        ON product_catalogues
        USING (business_id = NULLIF(current_setting('app.business_id', true), ''))
    """)
    op.execute("""
        CREATE POLICY "Public read for product_catalogues"
        ON product_catalogues FOR SELECT
        USING (NULLIF(current_setting('app.business_id', true), '') IS NULL)
    """)


def downgrade() -> None:
    op.drop_table("product_catalogues")
