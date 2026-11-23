"""Add stock_alerts table and open-box delivery fields on orders.

Revision ID: 20261123_1000
Revises: 20261122_1500
Create Date: 2026-11-23 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261123_1000"
down_revision: Union[str, None] = "20261122_1500"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create stock_alerts table for back-in-stock notifications
    op.execute("""
    CREATE TABLE IF NOT EXISTS stock_alerts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
        notified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_stock_alerts_phone_product UNIQUE (phone, product_id)
    );

    CREATE INDEX IF NOT EXISTS ix_stock_alerts_product_pending 
    ON stock_alerts(product_id) 
    WHERE notified_at IS NULL;

    CREATE INDEX IF NOT EXISTS ix_stock_alerts_phone 
    ON stock_alerts(phone);
    """)

    # 2. Add Open Box Delivery (OBD) & Delivery OTP fields to orders table
    op.execute("""
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10),
    ADD COLUMN IF NOT EXISTS is_open_box BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS delivery_verified_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS ix_orders_delivery_otp 
    ON orders(delivery_otp) 
    WHERE delivery_otp IS NOT NULL;
    """)

    # 3. Grant table permissions to emivo_app role
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alerts TO emivo_app;
        END IF;
    END $$;
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS stock_alerts CASCADE;
    ALTER TABLE orders 
    DROP COLUMN IF EXISTS delivery_otp,
    DROP COLUMN IF EXISTS is_open_box,
    DROP COLUMN IF EXISTS delivery_verified_at;
    """)
