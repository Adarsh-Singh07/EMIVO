import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def reset_db():
    engine = create_async_engine("postgresql+asyncpg://postgres:Ujjwal8651%23@db.mpwllyouzvnqupwmlmaz.supabase.co:5432/postgres")
    async with engine.begin() as conn:
        # Drop public schema and recreate
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
    await engine.dispose()
    print("Schema reset successful.")

asyncio.run(reset_db())
