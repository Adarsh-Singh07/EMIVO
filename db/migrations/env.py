import asyncio
import os
import sys

# Add apps/api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'api')))

from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from alembic import context

from core.models import Base
# Import all required models to ensure they are registered with metadata
from modules.businesses.models import Business
from modules.users.models import User
from modules.products.models import Product, ProductVariant, ProductMedia, Category
from modules.orders.models import Order, OrderItem
from modules.customers.models import Customer
from modules.carts.models import Cart, CartItem
from modules.coupons.models import Coupon, CouponUsage
from modules.payments.models import Payment, PaymentEvent
from modules.search.models import ProductEmbedding
from modules.settings.models import BusinessSettings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Setup database URL
from core.config import settings
config.set_main_option("sqlalchemy.url", settings.sync_database_url.replace("postgresql://", "postgresql+asyncpg://").replace("%", "%%"))

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"statement_cache_size": 0},
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())





