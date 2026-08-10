import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def apply_rls():
    engine = create_async_engine("postgresql+asyncpg://postgres:Ujjwal8651%23@db.mpwllyouzvnqupwmlmaz.supabase.co:5432/postgres")
    
    rls_dir = "db/rls"
    files = sorted([f for f in os.listdir(rls_dir) if f.endswith('.sql')])
    
    async with engine.begin() as conn:
        for file in files:
            path = os.path.join(rls_dir, file)
            print(f"Applying {path}...")
            with open(path, 'r') as f:
                sql = f.read()
                # Split by ;\n to separate statements
                statements = [s.strip() for s in sql.split(';') if s.strip()]
                for stmt in statements:
                    await conn.execute(text(stmt))
    
    await engine.dispose()
    print("RLS applied successfully.")

if __name__ == "__main__":
    asyncio.run(apply_rls())
