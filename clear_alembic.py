import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def clear_alembic():
    engine = create_async_engine("postgresql+asyncpg://postgres:Ujjwal8651%23@db.mpwllyouzvnqupwmlmaz.supabase.co:5432/postgres")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("DROP TABLE IF EXISTS alembic_version;"))
            print("Dropped alembic_version table.")
        except Exception as e:
            print(f"Error dropping alembic_version: {e}")
    await engine.dispose()

asyncio.run(clear_alembic())
