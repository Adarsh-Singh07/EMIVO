"""seller portal auth columns + media_refs table

Revision ID: 20261127_1000
Revises: 20261125_1200
Create Date: 2026-11-27 10:00:00

Closes two drifts between the SQLAlchemy models and what the migrations
actually build — both of which 500 on a database created purely from
alembic (exactly what a fresh production deploy does):

1. `sellers` — the seller-portal password auth shipped model changes only:
   `password_hash`, `contact_person`, `address_line2` and `state` existed on
   the Seller model but in no migration, so `/api/v1/seller/me` (which selects
   every mapped column) failed with `column sellers.password_hash does not
   exist`. All four are nullable, so the ADD COLUMN is metadata-only for
   existing rows: no backfill, no rewrite, no lock beyond the catalog grab.

2. `media_refs` — the media module is mounted in main.py and exports MediaRef
   (Base + TimestampMixin + TenantMixin), but no migration ever created its
   table. Latent today (no code path writes it yet), guaranteed breakage the
   day one does. Created here so the module's contract matches the database.

The dormant `entitlements` module also declares tables with no migration;
its router is not mounted and nothing imports the repository, so those
tables are deliberately NOT created here — a migration should accompany the
work that actually mounts it.

RLS on media_refs follows the bank_offers pattern: policies created without
a TO role (the emivo_app role may not exist when migrations run on a test
database), tenant-scoped via app.business_id.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261127_1000"
down_revision: Union[str, None] = "20261125_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1) Seller portal auth columns — nullable, metadata-only for existing rows.
    conn.execute(sa.text(
        "ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS address_line2 TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS state VARCHAR(100)"
    ))
    conn.execute(sa.text(
        "COMMENT ON COLUMN public.sellers.password_hash IS "
        "'Hashed seller-portal password (None until the seller sets one)'"
    ))

    # 2) media_refs — R2 upload references for the mounted media module.
    #    id is uuid (the model defaults uuid4 client-side; the DB default is a
    #    safety net for non-ORM inserts). PostgreSQL 13+ ships
    #    gen_random_uuid() in core, so no extension is needed.
    conn.execute(sa.text(
        """
        CREATE TABLE IF NOT EXISTS public.media_refs (
            id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            provider      VARCHAR(50)  NOT NULL DEFAULT 'r2',
            bucket        VARCHAR(100) NOT NULL,
            key           VARCHAR(500) NOT NULL,
            content_type  VARCHAR(100),
            size_bytes    INTEGER,
            filename      VARCHAR(255),
            created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
            business_id   VARCHAR(36)  NOT NULL
        )
        """
    ))
    conn.execute(sa.text(
        "COMMENT ON TABLE public.media_refs IS "
        "'Cloudflare R2 object references created by the media module'"
    ))
    conn.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_media_refs_business_id ON public.media_refs (business_id)")
    )
    conn.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_media_refs_key ON public.media_refs (key)")
    )

    # Conditional grant: emivo_app exists in production but not on a fresh CI
    # database — an unguarded GRANT aborts the whole migration.
    conn.execute(sa.text(
        """
        DO $$ BEGIN
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_refs TO emivo_app;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
        """
    ))

    conn.execute(sa.text("ALTER TABLE public.media_refs ENABLE ROW LEVEL SECURITY"))
    conn.execute(sa.text("ALTER TABLE public.media_refs FORCE ROW LEVEL SECURITY"))
    conn.execute(sa.text('DROP POLICY IF EXISTS "media_refs_tenant_write" ON public.media_refs'))
    conn.execute(sa.text(
        """
        CREATE POLICY "media_refs_tenant_write" ON public.media_refs FOR ALL
            USING (business_id::text = NULLIF(current_setting('app.business_id', true), ''))
            WITH CHECK (business_id::text = NULLIF(current_setting('app.business_id', true), ''))
        """
    ))


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(sa.text('DROP POLICY IF EXISTS "media_refs_tenant_write" ON public.media_refs'))
    conn.execute(sa.text("DROP TABLE IF EXISTS public.media_refs CASCADE"))

    conn.execute(sa.text("ALTER TABLE public.sellers DROP COLUMN IF EXISTS state"))
    conn.execute(sa.text("ALTER TABLE public.sellers DROP COLUMN IF EXISTS address_line2"))
    conn.execute(sa.text("ALTER TABLE public.sellers DROP COLUMN IF EXISTS contact_person"))
    conn.execute(sa.text("ALTER TABLE public.sellers DROP COLUMN IF EXISTS password_hash"))
