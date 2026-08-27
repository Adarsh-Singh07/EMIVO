import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    old_url = os.environ.get("STAGING_SYNC_DATABASE_URL")
    new_url = os.environ.get("SYNC_DATABASE_URL")

    print(f"Connecting to old: {old_url}")
    print(f"Connecting to new: {new_url}")
    
    old_engine = create_async_engine(old_url.replace("postgresql://", "postgresql+asyncpg://"))
    new_engine = create_async_engine(new_url.replace("postgresql://", "postgresql+asyncpg://"))

    async with old_engine.connect() as old_conn:
        # Check users to see it works
        res = await old_conn.execute(text("SELECT email FROM users LIMIT 2"))
        print(res.fetchall())
        
asyncio.run(main())
