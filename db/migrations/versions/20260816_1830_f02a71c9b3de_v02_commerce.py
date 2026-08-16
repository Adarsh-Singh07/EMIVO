"""v02_commerce: inventory, addresses, wishlists, notifications, merchandising columns

Adds the v0.2 commerce schema: inventory with reservation semantics + audit trail,
first-class addresses/wishlists, in-app notifications, newsletter capture, product
merchandising (MRP/sale price/offer window/brand/slug/status/featured/category/specs),
order fulfillment fields (order number, coupon, payment method, tracking), and fixes
the payments.amount type drift (float -> integer paise). Additive-only; backfills
existing rows. RLS policies for new tables ship separately in db/rls/10_v02_commerce.sql.

Revision ID: f02a71c9b3de
Revises: 40a4b12c8e1d
Create Date: 2026-08-16 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'f02a71c9b3de'
down_revision = '40a4b12c8e1d'
branch_labels = None
depends_on = None


def upgrade():
    # --- Full-text / trigram search support -------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # --- New enums (idempotent DO blocks; create_type=False below prevents
    # SQLAlchemy from re-emitting CREATE TYPE inside create_table) ------------
    op.execute("DO $$ BEGIN CREATE TYPE productstatus AS ENUM ('DRAFT','ACTIVE','ARCHIVED');"
               " EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE inventoryreason AS ENUM"
               " ('RESTOCK','SALE','RESERVE','RELEASE','ADJUST','COUNT','RETURN','DAMAGE');"
               " EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    productstatus = postgresql.ENUM('DRAFT', 'ACTIVE', 'ARCHIVED', name='productstatus', create_type=False)

    # --- Products: merchandising ------------------------------------------
    op.add_column('products', sa.Column('mrp', sa.Integer(), nullable=True))
    op.add_column('products', sa.Column('sale_price', sa.Integer(), nullable=True))
    op.add_column('products', sa.Column('offer_starts_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('products', sa.Column('offer_ends_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('products', sa.Column('brand', sa.String(length=120), nullable=True))
    op.add_column('products', sa.Column('slug', sa.String(length=280), nullable=True))
    op.add_column('products', sa.Column(
        'status', productstatus, nullable=False, server_default='ACTIVE'))
    op.add_column('products', sa.Column(
        'featured', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('products', sa.Column('specs', sa.JSON(), nullable=True))
    op.add_column('products', sa.Column('tags', sa.JSON(), nullable=True))
    op.add_column('products', sa.Column(
        'category_id', sa.String(length=36), nullable=True))
    op.create_foreign_key(
        'fk_products_category_id', 'products', 'categories',
        ['category_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_products_status', 'products', ['status'])
    op.create_index('ix_products_slug', 'products', ['slug'])
    op.create_index('ix_products_featured', 'products', ['featured'])
    op.create_index('ix_products_category_id', 'products', ['category_id'])
    op.create_index('ix_products_business_status', 'products', ['business_id', 'status'])

    # --- Categories / media ------------------------------------------------
    op.add_column('categories', sa.Column('slug', sa.String(length=280), nullable=True))
    op.add_column('categories', sa.Column(
        'position', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('product_media', sa.Column(
        'position', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('product_media', sa.Column('alt_text', sa.String(length=255), nullable=True))

    # --- Orders: fulfillment fields ----------------------------------------
    op.add_column('orders', sa.Column('order_number', sa.String(length=30), nullable=True))
    op.add_column('orders', sa.Column('payment_method', sa.String(length=20), nullable=True))
    op.add_column('orders', sa.Column('coupon_code', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('tracking_number', sa.String(length=120), nullable=True))
    op.add_column('orders', sa.Column('tracking_url', sa.String(length=500), nullable=True))
    op.add_column('orders', sa.Column('shipped_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column(
        'stock_committed', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # --- Payments: fix float->integer paise drift --------------------------
    op.execute("ALTER TABLE payments ALTER COLUMN amount TYPE INTEGER USING (amount::integer)")

    # --- Inventory ----------------------------------------------------------
    op.create_table(
        'inventory',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('product_id', sa.String(length=36),
                  sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('business_id', sa.String(length=36), nullable=False),
        sa.Column('on_hand', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reserved', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('on_hand >= 0', name='ck_inventory_on_hand_nonnegative'),
        sa.CheckConstraint('reserved >= 0', name='ck_inventory_reserved_nonnegative'),
        sa.CheckConstraint('reserved <= on_hand', name='ck_inventory_reserved_within_on_hand'),
        sa.UniqueConstraint('product_id', name='uq_inventory_product'),
    )
    op.create_index('ix_inventory_business', 'inventory', ['business_id'])

    op.create_table(
        'inventory_movements',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('product_id', sa.String(length=36),
                  sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('business_id', sa.String(length=36), nullable=False),
        sa.Column('order_id', sa.String(length=36), nullable=True),
        sa.Column('delta_on_hand', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('delta_reserved', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('on_hand_after', sa.Integer(), nullable=False),
        sa.Column('reserved_after', sa.Integer(), nullable=False),
        sa.Column('reason', postgresql.ENUM(
            'RESTOCK', 'SALE', 'RESERVE', 'RELEASE', 'ADJUST', 'COUNT', 'RETURN', 'DAMAGE',
            name='inventoryreason', create_type=False), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_inventory_movements_product_created', 'inventory_movements', ['product_id', 'created_at'])
    op.create_index('ix_inventory_movements_business', 'inventory_movements', ['business_id'])
    op.create_index('ix_inventory_movements_order_id', 'inventory_movements', ['order_id'])

    # --- Addresses ----------------------------------------------------------
    op.create_table(
        'addresses',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('label', sa.String(length=50), nullable=True),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('phone', sa.String(length=15), nullable=False),
        sa.Column('line1', sa.String(length=255), nullable=False),
        sa.Column('line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=120), nullable=False),
        sa.Column('state', sa.String(length=120), nullable=False),
        sa.Column('pincode', sa.String(length=6), nullable=False),
        sa.Column('country', sa.String(length=2), nullable=False, server_default='IN'),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_addresses_user_id', 'addresses', ['user_id'])

    # --- Wishlist -----------------------------------------------------------
    op.create_table(
        'wishlist_items',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.String(length=36),
                  sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('user_id <> product_id', name='ck_wishlist_not_self'),
    )
    op.create_unique_constraint('uq_wishlist_user_product', 'wishlist_items', ['user_id', 'product_id'])
    op.create_index('ix_wishlist_user_id', 'wishlist_items', ['user_id'])

    # --- Notifications (in-app center) --------------------------------------
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.String(length=2000), nullable=False),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_notifications_user_created', 'notifications', ['user_id', 'created_at'])
    op.create_index('ix_notifications_user_unread', 'notifications', ['user_id', 'read_at'])

    # --- Newsletter -----------------------------------------------------------
    op.create_table(
        'newsletter_subscribers',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False, server_default='storefront'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_unique_constraint('uq_newsletter_email', 'newsletter_subscribers', ['email'])

    # --- Trigram search indexes ------------------------------------------------
    op.execute("CREATE INDEX ix_products_name_trgm ON products USING gin (name gin_trgm_ops)")
    op.execute("CREATE INDEX ix_products_brand_trgm ON products USING gin (brand gin_trgm_ops)")
    op.execute("CREATE INDEX ix_products_sku_trgm ON products USING gin (sku gin_trgm_ops)")

    # --- Backfills --------------------------------------------------------------
    # Existing products become ACTIVE with slugs and MRP defaults; inventory rows at zero stock.
    op.execute("""
        UPDATE products SET
            status = 'ACTIVE',
            mrp = COALESCE(mrp, price),
            slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
                   || '-' || left(id::text, 6)
        WHERE slug IS NULL OR mrp IS NULL OR status IS NULL
    """)
    op.execute("""
        INSERT INTO inventory (id, product_id, business_id, on_hand, reserved, low_stock_threshold)
        SELECT gen_random_uuid()::text, p.id, p.business_id, 0, 0, 5
        FROM products p
        WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id)
    """)
    # Order numbers for historical orders (date + first 6 uuid chars keeps uniqueness at this scale)
    op.execute("""
        UPDATE orders o SET order_number =
            'ELK-' || to_char(o.created_at AT TIME ZONE 'UTC', 'YYMMDD') || '-' || upper(left(o.id::text, 6))
        WHERE o.order_number IS NULL
    """)
    op.execute("""
        UPDATE orders o SET payment_method = CASE
            WHEN EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id) THEN 'ONLINE'
            ELSE 'COD' END
        WHERE o.payment_method IS NULL
    """)
    op.execute("UPDATE categories SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL")


def downgrade():
    op.drop_table('newsletter_subscribers')
    op.drop_table('notifications')
    op.drop_table('wishlist_items')
    op.drop_table('addresses')
    op.drop_index('ix_inventory_movements_order_id', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_business', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_product_created', table_name='inventory_movements')
    op.drop_table('inventory_movements')
    op.drop_index('ix_inventory_business', table_name='inventory')
    op.drop_table('inventory')
    op.execute("ALTER TABLE payments ALTER COLUMN amount TYPE DOUBLE PRECISION USING (amount::double precision)")
    op.drop_column('orders', 'stock_committed')
    op.drop_column('orders', 'delivered_at')
    op.drop_column('orders', 'shipped_at')
    op.drop_column('orders', 'tracking_url')
    op.drop_column('orders', 'tracking_number')
    op.drop_column('orders', 'coupon_code')
    op.drop_column('orders', 'payment_method')
    op.drop_column('orders', 'order_number')
    op.drop_column('product_media', 'alt_text')
    op.drop_column('product_media', 'position')
    op.drop_column('categories', 'position')
    op.drop_column('categories', 'slug')
    op.drop_index('ix_products_business_status', table_name='products')
    op.drop_index('ix_products_category_id', table_name='products')
    op.drop_index('ix_products_featured', table_name='products')
    op.drop_index('ix_products_slug', table_name='products')
    op.drop_index('ix_products_status', table_name='products')
    op.drop_constraint('fk_products_category_id', 'products', type_='foreignkey')
    for col in ('tags', 'specs', 'category_id', 'featured', 'status', 'slug', 'brand',
                'offer_ends_at', 'offer_starts_at', 'sale_price', 'mrp'):
        op.drop_column('products', col)
    op.execute("DROP INDEX IF EXISTS ix_products_sku_trgm")
    op.execute("DROP INDEX IF EXISTS ix_products_brand_trgm")
    op.execute("DROP INDEX IF EXISTS ix_products_name_trgm")
    sa.Enum(name='inventoryreason').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='productstatus').drop(op.get_bind(), checkfirst=True)
