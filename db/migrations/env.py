import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# alembic env.py stub
config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = None

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

def run_migrations_online() -> None:
    # Online mode stub
    pass

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
