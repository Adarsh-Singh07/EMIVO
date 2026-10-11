"""One cart per guest session / per user (unique partial indexes + dedupe).

A race in get_or_create (two concurrent calls before the first commits) can
leave two carts for the same session. `get_by_session` read via
`scalar_one_or_none`, which raises MultipleResultsFound -> a 500 -> the
frontend treats the cart as broken and the buyer's items appear to vanish.
This migration folds any existing duplicate into the most recent cart
(summing identical product+variant lines, inserting the rest) and adds
unique partial indexes so the invariant is enforced at the DB level.

Revision ID: 20261012_1000
Revises: 20261011_1000
Create Date: 2026-10-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261012_1000"
down_revision: Union[str, None] = "20261011_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CTE = """
WITH ranked AS (
    SELECT c.id AS cart_id,
           row_number() OVER (PARTITION BY {key}
                              ORDER BY c.created_at DESC, c.id DESC) AS rn
    FROM carts c
    WHERE {key} IS NOT NULL
),
survivors AS (
    SELECT r.cart_id AS keep_cart, c.{key} AS k
    FROM ranked r
    JOIN carts c ON c.id = r.cart_id
    WHERE r.rn = 1
),
drop_keep AS (
    SELECT d.cart_id AS drop_cart, s.keep_cart
    FROM ranked d
    JOIN carts c ON c.id = d.cart_id
    JOIN survivors s ON s.k = c.{key}
    WHERE d.rn > 1
)
"""

_UPDATE = """{cte}
UPDATE cart_items AS ki
SET quantity = ki.quantity + dci.quantity
FROM drop_keep dk
JOIN cart_items dci ON dci.cart_id = dk.drop_cart
WHERE ki.cart_id = dk.keep_cart
  AND ki.product_id = dci.product_id
  AND ki.variant_id IS NOT DISTINCT FROM dci.variant_id
"""

_INSERT = """{cte}
INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, created_at, updated_at)
SELECT gen_random_uuid(), dk.keep_cart,
       dci.product_id, dci.variant_id, dci.quantity, now(), now()
FROM drop_keep dk
JOIN cart_items dci ON dci.cart_id = dk.drop_cart
WHERE NOT EXISTS (
    SELECT 1 FROM cart_items ki
    WHERE ki.cart_id = dk.keep_cart
      AND ki.product_id = dci.product_id
      AND ki.variant_id IS NOT DISTINCT FROM dci.variant_id
)
"""

_DELETE_ITEMS = """{cte}
DELETE FROM cart_items ci
USING drop_keep dk
WHERE ci.cart_id = dk.drop_cart
"""

_DELETE_CARTS = """{cte}
DELETE FROM carts c
USING drop_keep dk
WHERE dk.drop_cart = c.id
"""


def _dedupe(conn, key: str, index_clause: str, index_name: str) -> None:
    """Keep the most recent cart per key, fold the older carts' items into
    it, drop the superseded carts, then enforce uniqueness with a partial
    unique index (so the get_or_create race can never recreate a duplicate)."""
    cte = _CTE.format(key=key)

    # 1) Sum quantities of lines already present in the surviving cart.
    conn.execute(sa.text(_UPDATE.format(cte=cte)))

    # 2) Insert lines the surviving cart doesn't have yet.
    conn.execute(sa.text(_INSERT.format(cte=cte)))

    # 3) Drop the superseded carts' item rows (the FK has no ON DELETE
    #    CASCADE) and then the superseded carts themselves.
    conn.execute(sa.text(_DELETE_ITEMS.format(cte=cte)))
    conn.execute(sa.text(_DELETE_CARTS.format(cte=cte)))

    # 4) Enforce the invariant at the DB level.
    conn.execute(sa.text(f"CREATE UNIQUE INDEX {index_name} ON carts {index_clause}"))


def upgrade() -> None:
    conn = op.get_bind()

    # One cart per guest session (the session uuid is globally unique).
    _dedupe(
        conn,
        key="session_id",
        index_clause="(session_id) WHERE session_id IS NOT NULL",
        index_name="uq_carts_session",
    )

    # One cart per user (v0.2 runs a single store business).
    _dedupe(
        conn,
        key="user_id",
        index_clause="(user_id) WHERE user_id IS NOT NULL",
        index_name="uq_carts_user",
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP INDEX IF EXISTS uq_carts_session"))
    conn.execute(sa.text("DROP INDEX IF EXISTS uq_carts_user"))
