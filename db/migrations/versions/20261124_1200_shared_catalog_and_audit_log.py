"""shared ELEKTRIX catalog + professional append-only audit log

Two structural changes.

1. Shared catalog
   Products belong to the ELEKTRIX store tenant, never to a seller. Anyone may
   add a product; every seller may list (offer) any product. A seller owns
   stock, not catalog rows. Today products.business_id can point at a seller's
   business id, which hides those products from the rest of the catalog, and
   order attribution reads products.seller_id (the *author*) instead of the
   listing the buyer actually chose. This migration:
     * moves seller-owned product rows into the store tenant;
     * adds order_items.seller_listing_id and backfills it so attribution can
       follow the chosen offer rather than the product's author;
     * documents products.seller_id as provenance ("created by"), not ownership.

2. Audit log
   Append-only public.audit_logs recording who did what, to which entity, with
   before/after state, request metadata and outcome. Enforced by RLS with no
   UPDATE/DELETE policy plus revoked DML grants, so history cannot be rewritten
   from application code.

Each statement is executed separately: this project runs Alembic over asyncpg,
which refuses multiple commands in one prepared statement.

Revision ID: 20261124_1200
Revises: 20261124_1000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "20261124_1200"
down_revision: Union[str, None] = "20261124_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 1. Shared catalog                                                   #
    # ------------------------------------------------------------------ #

    # Product rows that sit under a seller business id move to the store
    # tenant. "Seller business" is decided by the sellers table, not by
    # businesses.is_seller: the ELEKTRIX store row itself carries
    # is_seller = true, so that flag cannot discriminate.
    op.execute(
        """
        UPDATE public.products p
        SET business_id = (
                SELECT b.id
                FROM public.businesses b
                WHERE b.id = coalesce(
                    NULLIF(current_setting('app.store_business_id', true), ''),
                    '7f2515ec-c52f-4f74-8b31-0c421de54dc6'
                )
                LIMIT 1
            ),
            updated_at = now()
        WHERE EXISTS (
            SELECT 1 FROM public.sellers s WHERE s.id = p.business_id
        )
          AND p.business_id <> coalesce(
                NULLIF(current_setting('app.store_business_id', true), ''),
                '7f2515ec-c52f-4f74-8b31-0c421de54dc6'
              )
        """
    )

    # Provenance semantics: products.seller_id records who entered the product
    # into the shared catalog. It grants no exclusivity and drives no
    # attribution once a listing is known.
    op.execute(
        """
        COMMENT ON COLUMN public.products.seller_id IS
        'Provenance only: seller who entered this product into the shared ELEKTRIX catalog. Not ownership; every seller may list any product.'
        """
    )

    # The offer a buyer actually selected. Order attribution follows this when
    # present and falls back to the product's provenance otherwise.
    op.execute(
        "ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_listing_id varchar(36)"
    )
    op.execute(
        """
        DO $$
        BEGIN
            ALTER TABLE public.order_items
                ADD CONSTRAINT fk_order_items_seller_listing
                FOREIGN KEY (seller_listing_id)
                REFERENCES public.seller_listings(id)
                ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_order_items_seller_listing
        ON public.order_items (seller_listing_id)
        WHERE seller_listing_id IS NOT NULL
        """
    )

    # Backfill: attach each historical item to the seller's active listing for
    # that product so legacy rows gain explicit offer attribution.
    op.execute(
        """
        UPDATE public.order_items oi
        SET seller_listing_id = sl.id
        FROM public.seller_listings sl
        WHERE oi.seller_listing_id IS NULL
          AND sl.product_id = oi.product_id
          AND sl.seller_id::text = oi.seller_id::text
          AND sl.is_active = true
        """
    )

    # ------------------------------------------------------------------ #
    # 2. Audit log                                                        #
    # ------------------------------------------------------------------ #

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.audit_logs (
            id              varchar(36)  NOT NULL,
            seq             bigserial    NOT NULL,
            occurred_at     timestamptz  NOT NULL DEFAULT now(),
            actor_type      varchar(20)  NOT NULL DEFAULT 'system',
            actor_id        varchar(64),
            actor_email     varchar(255),
            actor_name      varchar(255),
            actor_role      varchar(40),
            business_id     varchar(36),
            action          varchar(80)  NOT NULL,
            entity_type     varchar(60)  NOT NULL,
            entity_id       varchar(64),
            entity_label    varchar(255),
            status          varchar(20)  NOT NULL DEFAULT 'success',
            severity        varchar(20)  NOT NULL DEFAULT 'info',
            changed_fields  jsonb        NOT NULL DEFAULT '[]'::jsonb,
            before_state    jsonb,
            after_state     jsonb,
            metadata        jsonb        NOT NULL DEFAULT '{}'::jsonb,
            ip_address      inet,
            user_agent      text,
            request_id      varchar(64),
            http_method     varchar(10),
            http_path       text,
            CONSTRAINT pk_audit_logs PRIMARY KEY (id),
            CONSTRAINT uq_audit_logs_seq UNIQUE (seq)
        )
        """
    )

    op.execute(
        """
        COMMENT ON TABLE public.audit_logs IS
        'Append-only audit trail: who changed what, when, from where, and the before/after state. No UPDATE or DELETE is permitted.'
        """
    )

    for stmt in (
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_occurred ON public.audit_logs (occurred_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_entity ON public.audit_logs (entity_type, entity_id, occurred_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_actor ON public.audit_logs (actor_id, occurred_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON public.audit_logs (action, occurred_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_business ON public.audit_logs (business_id, occurred_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_status ON public.audit_logs (status) WHERE status <> 'success'",
    ):
        op.execute(stmt)

    # Append-only by privilege: the application role may read and append only.
    for stmt in (
        "REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC",
        "GRANT SELECT, INSERT ON TABLE public.audit_logs TO emivo_app",
        "REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM emivo_app",
        "GRANT USAGE, SELECT ON SEQUENCE public.audit_logs_seq_seq TO emivo_app",
    ):
        op.execute(stmt)

    op.execute("ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY")

    # Staff see the whole trail for their tenant; sellers see only their own
    # actions; the worker/system writes freely.
    op.execute('DROP POLICY IF EXISTS "Audit staff read" ON public.audit_logs')
    op.execute(
        """
        CREATE POLICY "Audit staff read" ON public.audit_logs
        FOR SELECT
        USING (public.elektrix_is_staff())
        """
    )

    op.execute('DROP POLICY IF EXISTS "Audit seller read own" ON public.audit_logs')
    op.execute(
        """
        CREATE POLICY "Audit seller read own" ON public.audit_logs
        FOR SELECT
        USING (
            public.elektrix_current_seller() IS NOT NULL
            AND actor_type = 'seller'
            AND actor_id = public.elektrix_current_seller()
        )
        """
    )

    op.execute('DROP POLICY IF EXISTS "Audit append" ON public.audit_logs')
    op.execute(
        """
        CREATE POLICY "Audit append" ON public.audit_logs
        FOR INSERT
        WITH CHECK (true)
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "Audit append" ON public.audit_logs')
    op.execute('DROP POLICY IF EXISTS "Audit seller read own" ON public.audit_logs')
    op.execute('DROP POLICY IF EXISTS "Audit staff read" ON public.audit_logs')
    op.execute("DROP TABLE IF EXISTS public.audit_logs CASCADE")

    op.execute("DROP INDEX IF EXISTS public.ix_order_items_seller_listing")
    op.execute(
        "ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS fk_order_items_seller_listing"
    )
    op.execute("ALTER TABLE public.order_items DROP COLUMN IF EXISTS seller_listing_id")

    op.execute("COMMENT ON COLUMN public.products.seller_id IS NULL")
    # Product business_id normalization is not reverted: it restores the
    # intended shared-catalog shape and moving rows back would re-hide them.
