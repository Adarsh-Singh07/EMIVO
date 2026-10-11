"""brands facet: brands table + category_brands association, backfilled from products.brand

Revision ID: 20261011_1000
Revises: 20260929_2000
Create Date: 2026-10-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20261011_1000'
down_revision: Union[str, None] = '20260929_2000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'brands',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('business_id', sa.String(), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('slug', sa.String(length=140), nullable=True),
        sa.Column('logo_url', sa.String(length=1000), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('business_id', 'name', name='uq_brands_business_name'),
        comment='Canonical brand list; products.brand stays the denormalized text value',
    )
    op.create_index('ix_brands_business_id', 'brands', ['business_id'])

    op.create_table(
        'category_brands',
        sa.Column('category_id', sa.String(), sa.ForeignKey('categories.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('brand_id', sa.String(), sa.ForeignKey('brands.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        comment='Ordered brand list per category (the "X by brand" facet)',
    )
    op.create_index('ix_category_brands_brand_id', 'category_brands', ['brand_id'])

    # Backfill: one brand row per distinct non-empty products.brand.
    op.execute("""
        INSERT INTO brands (id, business_id, name, slug, position)
        SELECT gen_random_uuid()::text,
               p.business_id,
               p.brand,
               TRIM(BOTH '-' FROM regexp_replace(lower(p.brand), '[^a-z0-9]+', '-', 'g')),
               row_number() OVER (PARTITION BY p.business_id ORDER BY p.brand)
        FROM (SELECT DISTINCT business_id, brand FROM products WHERE brand IS NOT NULL AND brand <> '') p
    """)

    # Backfill associations from where products actually use the brand.
    op.execute("""
        INSERT INTO category_brands (category_id, brand_id, position)
        SELECT p.category_id, b.id,
               row_number() OVER (PARTITION BY p.category_id ORDER BY b.name)
        FROM (SELECT DISTINCT category_id, business_id, brand FROM products
              WHERE category_id IS NOT NULL AND brand IS NOT NULL AND brand <> '') p
        JOIN brands b ON b.business_id = p.business_id AND b.name = p.brand
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table('category_brands')
    op.drop_index('ix_brands_business_id', table_name='brands')
    op.drop_table('brands')
