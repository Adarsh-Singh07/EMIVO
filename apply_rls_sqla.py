import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.config import settings
import sys

async def main():
    try:
        engine = create_async_engine(
            settings.sync_database_url.replace("postgresql://", "postgresql+asyncpg://"), 
            isolation_level="AUTOCOMMIT"
        )
        async with engine.connect() as conn:
            with open('db/rls/01_businesses.sql', 'r', encoding='utf-8') as f:
                sql = f.read()
            
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            for s in statements:
                try:
                    await conn.execute(text(s))
                except Exception as e:
                    print(f"Error executing statement: {s[:50]}... Error: {e}")
                    raise
                    
        print("✅ RLS successfully applied to Supabase via SQLAlchemy!")
    except Exception as e:
        print(f"❌ Error applying RLS: {e}")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
