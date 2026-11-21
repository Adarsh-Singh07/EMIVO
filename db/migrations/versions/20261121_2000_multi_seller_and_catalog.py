"""Add multi-seller tables and catalog duplicate candidates.

Revision ID: 20261121_2000
Revises: 20261106_2200
Create Date: 2026-11-21 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261121_2000"
down_revision: Union[str, None] = "20261106_2200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    statements = [
        "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT TRUE",
        """CREATE TABLE IF NOT EXISTS sellers (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            business_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            contact_person VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            address_line2 TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(20),
            gstin VARCHAR(50),
            commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
            status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            rating NUMERIC(3, 2) NOT NULL DEFAULT 4.90,
            rating_count INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id VARCHAR(36) REFERENCES sellers(id)",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APPROVED'",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS requested_by_seller_id VARCHAR(36) REFERENCES sellers(id)",
        """CREATE TABLE IF NOT EXISTS seller_listings (
            id VARCHAR(36) PRIMARY KEY,
            product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            seller_id VARCHAR(36) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            sku VARCHAR(100),
            price INTEGER NOT NULL,
            mrp INTEGER,
            stock INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            condition VARCHAR(50) NOT NULL DEFAULT 'NEW',
            estimated_delivery_days INTEGER NOT NULL DEFAULT 3,
            rating NUMERIC(3, 2) NOT NULL DEFAULT 4.80,
            rating_count INTEGER NOT NULL DEFAULT 24,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        "CREATE INDEX IF NOT EXISTS ix_seller_listings_product ON seller_listings (product_id)",
        "CREATE INDEX IF NOT EXISTS ix_seller_listings_seller ON seller_listings (seller_id)",
        "CREATE INDEX IF NOT EXISTS ix_seller_listings_price ON seller_listings (product_id, price, is_active)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_product ON seller_listings (seller_id, product_id)",
        """CREATE TABLE IF NOT EXISTS catalog_duplicate_candidates (
            id VARCHAR(36) PRIMARY KEY,
            product_a_id VARCHAR(36) NOT NULL,
            product_b_id VARCHAR(36) NOT NULL,
            suggested_master_id VARCHAR(36),
            similarity_score INTEGER NOT NULL DEFAULT 0,
            confidence_score INTEGER NOT NULL DEFAULT 0,
            ai_reason TEXT,
            suggested_clean_title TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
            detected_at TIMESTAMPTZ DEFAULT NOW(),
            reviewed_at TIMESTAMPTZ,
            reviewed_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )""",
    ]
    for stmt in statements:
        op.execute(stmt)


def downgrade() -> None:
    statements = [
        "DROP TABLE IF EXISTS catalog_duplicate_candidates CASCADE",
        "DROP TABLE IF EXISTS seller_listings CASCADE",
        "DROP TABLE IF EXISTS sellers CASCADE",
        "ALTER TABLE products DROP COLUMN IF EXISTS seller_id",
        "ALTER TABLE categories DROP COLUMN IF EXISTS requested_by_seller_id",
        "ALTER TABLE categories DROP COLUMN IF EXISTS status",
        "ALTER TABLE businesses DROP COLUMN IF EXISTS is_seller",
    ]
    for stmt in statements:
        op.execute(stmt)
