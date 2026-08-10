from core.models import Base
from collections.abc import AsyncGenerator
from contextvars import ContextVar

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import settings

# RLS context (business_id) set per request via middleware
tenant_context: ContextVar[str | None] = ContextVar("tenant_context", default=None)

# 04 Â§2: Connect over TLS with asyncpg, pooled Supavisor connection string in session/transaction mode.
# Use statement_cache_size=0, pool_pre_ping, and timeouts.

kw = {}
if settings.database_url.startswith("sqlite"):
    kw["poolclass"] = __import__("sqlalchemy.pool").pool.StaticPool
else:
    kw["pool_size"] = 10
    kw["max_overflow"] = 5
    kw["pool_pre_ping"] = True
    kw["pool_recycle"] = 3600
    kw["connect_args"] = {
        "command_timeout": 60,
        "statement_cache_size": 0,
        "server_settings": {
            "statement_timeout": "60000",
            "idle_in_transaction_session_timeout": "60000",
            "lock_timeout": "10000",
        },
    }

engine = create_async_engine(settings.database_url, echo=False, **kw)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get a connection from the pool and setup RLS.

    Critical: We connect as 'postgres' (which has BYPASSRLS), then immediately
    SET ROLE to 'emivo_app' (which has NOBYPASSRLS). All subsequent queries in
    this session execute as emivo_app, so RLS policies are enforced.
    """
    async with async_session_maker() as session:
        # Switch to restricted role — this makes RLS actually enforce
        await session.execute(text("SET LOCAL ROLE emivo_app"))

        # Initialize RLS context vars to empty (will be overridden by set_db_context per-request)
        await session.execute(text("SELECT set_config('app.business_id', '', true)"))
        await session.execute(text("SELECT set_config('app.user_id', '', true)"))

        try:
            yield session
        finally:
            pass


from typing import Any

from core.models import OutboxEvent


def insert_outbox_event(
    session: AsyncSession, event_type: str, payload: dict[str, Any]
) -> None:
    """
    Safely queues a record within the executing SQL transaction.
    Takes a DB session, type, and payload.
    """
    tenant_id = tenant_context.get()

    event = OutboxEvent(tenant_id=tenant_id, type=event_type, payload=payload)
    session.add(event)
