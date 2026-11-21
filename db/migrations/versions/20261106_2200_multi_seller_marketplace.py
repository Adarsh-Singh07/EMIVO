"""Multi-seller marketplace: sellers table, seller_listings table, business is_seller flag, and category approvals.

Revision ID: 20261106_2200
Revises: 20261012_1000
Create Date: 2026-11-06 22:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = "20261106_2200"
down_revision: Union[str, None] = "20261012_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = set(inspector.get_table_names())

    # 1. Create sellers table if not exists
    if "sellers" not in tables:
        op.create_table(
            "sellers",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("business_name", sa.String(length=255), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False, unique=True),
            sa.Column("phone", sa.String(length=50), nullable=True),
            sa.Column("city", sa.String(length=100), nullable=True),
            sa.Column("pincode", sa.String(length=20), nullable=True),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("gstin", sa.String(length=50), nullable=True),
            sa.Column("commission_rate", sa.Numeric(5, 2), nullable=False, server_default="0.0"),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="ACTIVE"),
            sa.Column("rating", sa.Numeric(3, 2), nullable=False, server_default="4.90"),
            sa.Column("rating_count", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_sellers_email", "sellers", ["email"])

    # 2. Add is_seller to businesses
    if "businesses" in tables:
        biz_cols = {c["name"] for c in inspector.get_columns("businesses")}
        if "is_seller" not in biz_cols:
            op.add_column("businesses", sa.Column("is_seller", sa.Boolean(), nullable=False, server_default=sa.true()))

    # 3. Add seller_id to products
    if "products" in tables:
        prod_cols = {c["name"] for c in inspector.get_columns("products")}
        if "seller_id" not in prod_cols:
            op.add_column("products", sa.Column("seller_id", sa.String(length=36), sa.ForeignKey("sellers.id", ondelete="SET NULL"), nullable=True))
            op.create_index("ix_products_seller_id", "products", ["seller_id"])

    # 4. Add status and requested_by_seller_id to categories
    if "categories" in tables:
        cat_cols = {c["name"] for c in inspector.get_columns("categories")}
        if "status" not in cat_cols:
            op.add_column("categories", sa.Column("status", sa.String(length=50), nullable=False, server_default="APPROVED"))
        if "requested_by_seller_id" not in cat_cols:
            op.add_column("categories", sa.Column("requested_by_seller_id", sa.String(length=36), sa.ForeignKey("sellers.id", ondelete="SET NULL"), nullable=True))

    # 5. Create seller_listings table
    if "seller_listings" not in tables:
        op.create_table(
            "seller_listings",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("product_id", sa.String(length=36), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
            sa.Column("seller_id", sa.String(length=36), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("sku", sa.String(length=100), nullable=True),
            sa.Column("price", sa.Integer(), nullable=False),
            sa.Column("mrp", sa.Integer(), nullable=True),
            sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("condition", sa.String(length=50), nullable=False, server_default="NEW"),
            sa.Column("estimated_delivery_days", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("rating", sa.Numeric(3, 2), nullable=False, server_default="4.80"),
            sa.Column("rating_count", sa.Integer(), nullable=False, server_default="24"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("seller_id", "product_id", name="uq_seller_product"),
        )
        op.create_index("ix_seller_listings_product", "seller_listings", ["product_id"])
        op.create_index("ix_seller_listings_seller", "seller_listings", ["seller_id"])
        op.create_index("ix_seller_listings_price", "seller_listings", ["product_id", "price", "is_active"])

    # 6. Grant emivo_app permissions if role exists
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sellers TO emivo_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seller_listings TO emivo_app;
            END IF;
        END $$;
    """))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = set(inspector.get_table_names())

    if "seller_listings" in tables:
        op.drop_table("seller_listings")
    if "categories" in tables:
        cat_cols = {c["name"] for c in inspector.get_columns("categories")}
        if "requested_by_seller_id" in cat_cols:
            op.drop_column("categories", "requested_by_seller_id")
        if "status" in cat_cols:
            op.drop_column("categories", "status")
    if "products" in tables:
        prod_cols = {c["name"] for c in inspector.get_columns("products")}
        if "seller_id" in prod_cols:
            op.drop_column("products", "seller_id")
    if "businesses" in tables:
        biz_cols = {c["name"] for c in inspector.get_columns("businesses")}
        if "is_seller" in biz_cols:
            op.drop_column("businesses", "is_seller")
    if "sellers" in tables:
        op.drop_table("sellers")
