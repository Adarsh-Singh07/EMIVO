import asyncpg
from contextvars import ContextVar
from typing import AsyncGenerator
from core.config import settings

# RLS context (business_id) set per request via middleware
tenant_context: ContextVar[str | None] = ContextVar("tenant_context", default=None)

class DatabaseManager:
    def __init__(self):
        self.pool: asyncpg.Pool = None

    async def connect(self):
        # statement_cache_size=0 is required for pgbouncer/supavisor transaction mode
        self.pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            statement_cache_size=0
        )

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

    async def get_connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Dependency to get a connection from the pool and setup RLS."""
        if not self.pool:
            raise RuntimeError("Database pool is not initialized")
            
        async with self.pool.acquire() as connection:
            business_id = tenant_context.get()
            
            # Start a transaction to ensure SET LOCAL is scoped correctly
            async with connection.transaction():
                if business_id:
                    # Enforced via Architectural finding P0-1
                    # SET LOCAL resets at the end of the transaction
                    await connection.execute(
                        "SET LOCAL app.business_id = ", 
                        business_id
                    )
                else:
                    await connection.execute("SET LOCAL app.business_id = ''")
                
                yield connection

db = DatabaseManager()
