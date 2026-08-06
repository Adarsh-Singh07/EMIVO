from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from fastapi import Depends
from core.config import settings
from core.database import tenant_context, db

# Create SQLAlchemy engine directly for the ORM, but we MUST ensure it uses 
# the underlying pool correctly to enforce RLS.
# Since we are using SQLAlchemy ORM, the standard approach to inject SET LOCAL using asyncpg
# is via SQLAlchemy events on checkout, OR by executing it right after yielding the session.

engine = create_async_engine(settings.database_url, echo=False, pool_size=10, max_overflow=5)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        business_id = tenant_context.get()
        if business_id:
            await session.execute("SET LOCAL app.business_id = :val", {"val": business_id})
        else:
            await session.execute("SET LOCAL app.business_id = ''")
        yield session

