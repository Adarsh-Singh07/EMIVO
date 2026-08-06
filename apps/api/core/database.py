import asyncpg
from core.config import settings

async def get_db_pool():
    # Will be configured with statement_cache_size=0 for pgbouncer/supavisor
    return await asyncpg.create_pool(dsn=settings.database_url)
