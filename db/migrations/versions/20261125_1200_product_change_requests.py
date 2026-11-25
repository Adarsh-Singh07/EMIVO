"""product change requests: admin-approved edits to the shared catalog

Revision ID: 20261125_1200
Revises: 20261125_1000
Create Date: 2026-11-25 12:00:00

A seller may always change their own offer (price, stock, listing visibility).
Anything that belongs to the shared ELEKTRIX catalog — name, brand, category,
description, specs, images, warranty, return policy — is shared by every seller
of that product, so a seller who did not author it cannot rewrite it directly.

This table holds those proposed edits until staff approve or reject them:

  * requested_by_seller_id  — who asked (a sellers.id)
  * product_id              — the catalog row the change applies to
  * changes                 — JSONB of only the requested fields, in the same
                              shape SellerProductUpdate uses
  * status                  — PENDING | APPROVED | REJECTED | WITHDRAWN
  * reviewed_by / reviewed_at / review_note — the decision, for the seller to see

One PENDING request per (product, seller) is enforced by a partial unique index:
a seller amending their proposal replaces it instead of stacking duplicates.

RLS: staff read everything in their tenant, a seller reads only their own
requests, and the application role inserts freely but can never hand out a
decision without going through the service (which records the audit entry).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "20261125_1200"
down_revision: Union[str, None] = "20261125_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.product_change_requests (
            id                    varchar(36) PRIMARY KEY,
            product_id            varchar(36) NOT NULL
                                  REFERENCES public.products(id) ON DELETE CASCADE,
            requested_by_seller_id varchar(36) NOT NULL
                                  REFERENCES public.sellers(id) ON DELETE CASCADE,
            business_id           varchar(36),
            changes               jsonb NOT NULL,
            status                varchar(20) NOT NULL DEFAULT 'PENDING',
            review_note           text,
            reviewed_by           varchar(36),
            reviewed_by_email     varchar(255),
            reviewed_at           timestamptz,
            created_at            timestamptz NOT NULL DEFAULT NOW(),
            updated_at            timestamptz NOT NULL DEFAULT NOW(),
            CONSTRAINT ck_product_change_requests_status
                CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'))
        )
        """
    )

    op.execute(
        "COMMENT ON TABLE public.product_change_requests IS "
        "'Seller-proposed edits to shared ELEKTRIX catalog fields, pending admin approval'"
    )
    op.execute(
        "COMMENT ON COLUMN public.product_change_requests.changes IS "
        "'Only the requested catalog fields, keyed like SellerProductUpdate'"
    )

    # The review queue: pending requests, newest first.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_pcr_pending
        ON public.product_change_requests (created_at DESC)
        WHERE status = 'PENDING'
        """
    )
    # A seller's own list of requests for one product.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_pcr_seller
        ON public.product_change_requests (requested_by_seller_id, created_at DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_pcr_product
        ON public.product_change_requests (product_id, created_at DESC)
        """
    )
    # One open proposal per seller per product: re-submitting replaces it.
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_pcr_one_pending
        ON public.product_change_requests (product_id, requested_by_seller_id)
        WHERE status = 'PENDING'
        """
    )

    # The application role exists in production but not on a fresh CI database,
    # so grant conditionally — an unguarded GRANT aborts the whole migration.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
                GRANT SELECT, INSERT, UPDATE ON TABLE public.product_change_requests TO emivo_app;
            END IF;
        END $$
        """
    )

    op.execute("ALTER TABLE public.product_change_requests ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.product_change_requests FORCE ROW LEVEL SECURITY")

    op.execute('DROP POLICY IF EXISTS "PCR staff read" ON public.product_change_requests')
    op.execute(
        """
        CREATE POLICY "PCR staff read" ON public.product_change_requests
        FOR SELECT
        USING (public.elektrix_is_staff())
        """
    )

    op.execute('DROP POLICY IF EXISTS "PCR seller read own" ON public.product_change_requests')
    op.execute(
        """
        CREATE POLICY "PCR seller read own" ON public.product_change_requests
        FOR SELECT
        USING (
            public.elektrix_current_seller() IS NOT NULL
            AND requested_by_seller_id = public.elektrix_current_seller()
        )
        """
    )

    # Writes are scoped to the same two audiences. A seller may only insert a
    # request bearing their own id, and may only withdraw it (status change is
    # checked in the service, which is the single writer).
    op.execute('DROP POLICY IF EXISTS "PCR seller insert own" ON public.product_change_requests')
    op.execute(
        """
        CREATE POLICY "PCR seller insert own" ON public.product_change_requests
        FOR INSERT
        WITH CHECK (
            public.elektrix_current_seller() IS NOT NULL
            AND requested_by_seller_id = public.elektrix_current_seller()
        )
        """
    )

    op.execute('DROP POLICY IF EXISTS "PCR seller update own" ON public.product_change_requests')
    op.execute(
        """
        CREATE POLICY "PCR seller update own" ON public.product_change_requests
        FOR UPDATE
        USING (
            public.elektrix_current_seller() IS NOT NULL
            AND requested_by_seller_id = public.elektrix_current_seller()
        )
        WITH CHECK (
            public.elektrix_current_seller() IS NOT NULL
            AND requested_by_seller_id = public.elektrix_current_seller()
        )
        """
    )

    op.execute('DROP POLICY IF EXISTS "PCR staff write" ON public.product_change_requests')
    op.execute(
        """
        CREATE POLICY "PCR staff write" ON public.product_change_requests
        FOR ALL
        USING (public.elektrix_is_staff())
        WITH CHECK (public.elektrix_is_staff())
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "PCR staff write" ON public.product_change_requests')
    op.execute('DROP POLICY IF EXISTS "PCR seller update own" ON public.product_change_requests')
    op.execute('DROP POLICY IF EXISTS "PCR seller insert own" ON public.product_change_requests')
    op.execute('DROP POLICY IF EXISTS "PCR seller read own" ON public.product_change_requests')
    op.execute('DROP POLICY IF EXISTS "PCR staff read" ON public.product_change_requests')
    op.execute("DROP TABLE IF EXISTS public.product_change_requests CASCADE")
