"""return requests table + RETURNED orderstatus enum value

Revision ID: 20261128_1000
Revises: 20261127_1000
Create Date: 2026-11-28 10:00:00

Adds customer-initiated post-delivery return & refund tracking:
  * Adds 'RETURNED' to the native PostgreSQL `orderstatus` enum.
  * Creates `public.return_requests` with status machine
    (REQUESTED -> APPROVED -> PICKUP_SCHEDULED -> RETURNED -> REFUNDED,
     plus REJECTED / CLOSED) and reason enum
    (DAMAGED / DEFECTIVE / WRONG_ITEM / NOT_AS_DESCRIBED).
  * Conditional `emivo_app` grants + FORCE ROW LEVEL SECURITY:
      - Staff read/write within tenant (`app.business_id` + `elektrix_is_staff()`).
      - Customers read/insert own requests (`app.user_id` + `app.business_id`).
      - Sellers read requests for their own items (`elektrix_current_seller()`).

Each statement is executed separately because Alembic runs over asyncpg,
which rejects multiple commands in one prepared statement.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261128_1000"
down_revision: Union[str, None] = "20261127_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1) Add 'RETURNED' to orderstatus enum (not used in this migration's DML,
    #    so safe inside PG 12+ transaction blocks).
    conn.execute(sa.text("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'RETURNED'"))

    # 2) return_requests table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS public.return_requests (
                id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                return_number       VARCHAR(30) UNIQUE,
                order_id            VARCHAR(36) NOT NULL
                                    REFERENCES public.orders(id) ON DELETE CASCADE,
                order_item_id       VARCHAR(36) NOT NULL
                                    REFERENCES public.order_items(id) ON DELETE CASCADE,
                user_id             VARCHAR(36) NOT NULL
                                    REFERENCES public.users(id),
                business_id         VARCHAR(36) NOT NULL,
                seller_id           VARCHAR(36)
                                    REFERENCES public.sellers(id) ON DELETE SET NULL,
                qty                 INTEGER NOT NULL,
                reason              VARCHAR(30) NOT NULL,
                customer_note       TEXT,
                status              VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
                refund_amount       INTEGER NOT NULL DEFAULT 0,
                payment_id          VARCHAR(36)
                                    REFERENCES public.payments(id) ON DELETE SET NULL,
                resolution_note     TEXT,
                pickup_tracking     VARCHAR(120),
                reviewed_by         VARCHAR(36),
                requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                approved_at         TIMESTAMPTZ,
                pickup_scheduled_at TIMESTAMPTZ,
                returned_at         TIMESTAMPTZ,
                refunded_at         TIMESTAMPTZ,
                rejected_at         TIMESTAMPTZ,
                closed_at           TIMESTAMPTZ,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT ck_return_requests_qty_positive CHECK (qty > 0),
                CONSTRAINT ck_return_requests_reason CHECK (
                    reason IN ('DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED')
                ),
                CONSTRAINT ck_return_requests_status CHECK (
                    status IN (
                        'REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED',
                        'RETURNED', 'REFUNDED', 'REJECTED', 'CLOSED'
                    )
                )
            )
            """
        )
    )

    conn.execute(
        sa.text(
            "COMMENT ON TABLE public.return_requests IS "
            "'Customer-initiated post-delivery return and refund requests'"
        )
    )

    for idx_sql in (
        "CREATE INDEX IF NOT EXISTS ix_return_requests_business_id ON public.return_requests (business_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_return_requests_order_id ON public.return_requests (order_id)",
        "CREATE INDEX IF NOT EXISTS ix_return_requests_order_item_id ON public.return_requests (order_item_id)",
        "CREATE INDEX IF NOT EXISTS ix_return_requests_user_id ON public.return_requests (user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_return_requests_seller_id ON public.return_requests (seller_id, created_at DESC) WHERE seller_id IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_return_requests_status ON public.return_requests (status, created_at DESC)",
    ):
        conn.execute(sa.text(idx_sql))

    # Conditional grant: emivo_app exists in production but not on a fresh CI DB.
    conn.execute(
        sa.text(
            """
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
                    GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_requests TO emivo_app;
                END IF;
            EXCEPTION WHEN OTHERS THEN NULL; END $$;
            """
        )
    )

    conn.execute(sa.text("ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY"))
    conn.execute(sa.text("ALTER TABLE public.return_requests FORCE ROW LEVEL SECURITY"))

    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_staff_all" ON public.return_requests'))
    conn.execute(
        sa.text(
            """
            CREATE POLICY "return_requests_staff_all" ON public.return_requests
            FOR ALL
            USING (
                public.elektrix_is_staff()
                AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
            )
            WITH CHECK (
                public.elektrix_is_staff()
                AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
            )
            """
        )
    )

    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_customer_read" ON public.return_requests'))
    conn.execute(
        sa.text(
            """
            CREATE POLICY "return_requests_customer_read" ON public.return_requests
            FOR SELECT
            USING (
                user_id::text = NULLIF(current_setting('app.user_id', true), '')
                AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
            )
            """
        )
    )

    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_customer_insert" ON public.return_requests'))
    conn.execute(
        sa.text(
            """
            CREATE POLICY "return_requests_customer_insert" ON public.return_requests
            FOR INSERT
            WITH CHECK (
                user_id::text = NULLIF(current_setting('app.user_id', true), '')
                AND business_id::text = NULLIF(current_setting('app.business_id', true), '')
            )
            """
        )
    )

    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_seller_read" ON public.return_requests'))
    conn.execute(
        sa.text(
            """
            CREATE POLICY "return_requests_seller_read" ON public.return_requests
            FOR SELECT
            USING (
                public.elektrix_current_seller() IS NOT NULL
                AND seller_id::text = public.elektrix_current_seller()
            )
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_seller_read" ON public.return_requests'))
    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_customer_insert" ON public.return_requests'))
    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_customer_read" ON public.return_requests'))
    conn.execute(sa.text('DROP POLICY IF EXISTS "return_requests_staff_all" ON public.return_requests'))
    conn.execute(sa.text("DROP TABLE IF EXISTS public.return_requests CASCADE"))
    # PostgreSQL enum value 'RETURNED' on orderstatus cannot be dropped cleanly; leave it as-is.
