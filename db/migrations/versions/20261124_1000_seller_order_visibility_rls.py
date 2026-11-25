"""seller order visibility: scope sellers to their own order items

Fixes the empty seller queue. The orders/order_items RLS policies only allowed
tenant match + (own user_id OR staff role). A seller JWT carries sub=seller.id,
which is not a users.id, so sellers matched nothing and saw zero orders.

Ownership is attributed in two steps, mirroring SellerService.get_seller_orders:
  1. order_items.seller_id, when populated;
  2. otherwise the owning product's seller_id (legacy rows created before
     order_items.seller_id was backfilled).
The migration also backfills that second group so the fallback becomes the
exception rather than the norm.

Adds:
  * elektrix_current_seller() helper reading app.seller_id
  * elektrix_seller_owns_item(order_item_id) and
    elektrix_seller_owns_order(order_id), both SECURITY DEFINER. Two reasons:
      - a policy on order_items that selects from orders (or vice versa)
        recurses when both tables carry RLS;
      - the product fallback must not be filtered by products' tenant policy.
  * seller SELECT policies on orders, order_items and products (the latter so a
    seller can still read a product whose business_id is the seller id rather
    than the store tenant).
  * backfill of order_items.seller_id from the owning product.
  * supporting index for the product-based ownership fallback.

Each statement is executed separately: this project runs Alembic over
asyncpg, which refuses multiple commands in one prepared statement.

Revision ID: 20261124_1000
Revises: 20261123_1600
"""
from typing import Sequence, Union

from alembic import op

revision: str = "20261124_1000"
down_revision: Union[str, None] = "20261123_1600"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Seller id the request is acting as (set by get_seller_db_context).
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.elektrix_current_seller()
        RETURNS text
        LANGUAGE sql
        STABLE
        AS $$
            SELECT NULLIF(current_setting('app.seller_id', true), '');
        $$
        """
    )

    # Per-order-item ownership: explicit attribution first, product fallback
    # second. SECURITY DEFINER keeps both the recursive orders lookup and the
    # products lookup out of RLS.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.elektrix_seller_owns_item(p_item_id text)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $$
            SELECT EXISTS (
                SELECT 1
                FROM public.order_items oi
                LEFT JOIN public.products p ON p.id = oi.product_id
                WHERE oi.id::text = p_item_id
                  AND (
                      oi.seller_id::text = NULLIF(current_setting('app.seller_id', true), '')
                      OR (
                          oi.seller_id IS NULL
                          AND p.seller_id::text = NULLIF(current_setting('app.seller_id', true), '')
                      )
                  )
            );
        $$
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.elektrix_seller_owns_order(p_order_id text)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $$
            SELECT EXISTS (
                SELECT 1
                FROM public.order_items oi
                LEFT JOIN public.products p ON p.id = oi.product_id
                WHERE oi.order_id::text = p_order_id
                  AND (
                      oi.seller_id::text = NULLIF(current_setting('app.seller_id', true), '')
                      OR (
                          oi.seller_id IS NULL
                          AND p.seller_id::text = NULLIF(current_setting('app.seller_id', true), '')
                      )
                  )
            );
        $$
        """
    )

    for stmt in (
        "REVOKE ALL ON FUNCTION public.elektrix_seller_owns_item(text) FROM PUBLIC",
        "REVOKE ALL ON FUNCTION public.elektrix_seller_owns_order(text) FROM PUBLIC",
    ):
        op.execute(stmt)

    # The application role exists in production but not on a fresh CI database,
    # so grant conditionally — an unguarded GRANT aborts the whole migration.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emivo_app') THEN
                GRANT EXECUTE ON FUNCTION public.elektrix_seller_owns_item(text) TO emivo_app;
                GRANT EXECUTE ON FUNCTION public.elektrix_seller_owns_order(text) TO emivo_app;
                GRANT EXECUTE ON FUNCTION public.elektrix_current_seller() TO emivo_app;
            END IF;
        END $$
        """
    )

    # Backfill attribution on items created before seller_id was written at
    # checkout. Idempotent: only touches rows that are still NULL and whose
    # product has a known seller.
    op.execute(
        """
        UPDATE public.order_items oi
        SET seller_id = p.seller_id,
            seller_name = COALESCE(oi.seller_name, s.business_name, s.name)
        FROM public.products p
        LEFT JOIN public.sellers s ON s.id = p.seller_id
        WHERE oi.product_id = p.id
          AND oi.seller_id IS NULL
          AND p.seller_id IS NOT NULL
        """
    )

    # Supports the product-based ownership fallback in the helpers above.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_products_seller_id
        ON public.products (seller_id)
        WHERE seller_id IS NOT NULL
        """
    )

    # Sellers may read only the orders they actually have items in.
    op.execute('DROP POLICY IF EXISTS "Seller reads own orders" ON public.orders')
    op.execute(
        """
        CREATE POLICY "Seller reads own orders" ON public.orders
        FOR SELECT
        USING (
            elektrix_current_seller() IS NOT NULL
            AND elektrix_seller_owns_order(id::text)
        )
        """
    )

    # Sellers may read only their own order items.
    op.execute('DROP POLICY IF EXISTS "Seller reads own order items" ON public.order_items')
    op.execute(
        """
        CREATE POLICY "Seller reads own order items" ON public.order_items
        FOR SELECT
        USING (
            elektrix_current_seller() IS NOT NULL
            AND elektrix_seller_owns_item(id::text)
        )
        """
    )

    # A seller's own products may live under the seller business id rather than
    # the store tenant, so the tenant policy alone would hide them.
    op.execute('DROP POLICY IF EXISTS "Seller reads own products" ON public.products')
    op.execute(
        """
        CREATE POLICY "Seller reads own products" ON public.products
        FOR SELECT
        USING (
            elektrix_current_seller() IS NOT NULL
            AND seller_id::text = elektrix_current_seller()
        )
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "Seller reads own products" ON public.products')
    op.execute('DROP POLICY IF EXISTS "Seller reads own order items" ON public.order_items')
    op.execute('DROP POLICY IF EXISTS "Seller reads own orders" ON public.orders')
    op.execute("DROP INDEX IF EXISTS public.ix_products_seller_id")
    op.execute("DROP FUNCTION IF EXISTS public.elektrix_seller_owns_item(text)")
    op.execute("DROP FUNCTION IF EXISTS public.elektrix_seller_owns_order(text)")
    op.execute("DROP FUNCTION IF EXISTS public.elektrix_current_seller()")
    # The seller_id backfill is not reverted: it is a correction of derived
    # data, and re-nulling it would re-break seller attribution.
