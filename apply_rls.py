"""Legacy single-file RLS applier — superseded by scripts/apply_all_rls.py
(used by the deploy pipeline). Kept only as a thin wrapper for old docs.
The hardcoded credential that was here has been removed: rotate the Supabase
postgres password (it lived in git history).
"""
import asyncio
import os
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def apply_rls():
    url = os.environ.get("SYNC_DATABASE_URL")
    if not url:
        sys.exit("Set SYNC_DATABASE_URL (see .env) — credentials are never hardcoded.")
    engine = create_async_engine(url.replace("postgresql://", "postgresql+asyncpg://", 1))

    rls_dir = "db/rls"
    files = sorted(f for f in os.listdir(rls_dir) if f.endswith(".sql"))

    async with engine.begin() as conn:
        for file in files:
            path = os.path.join(rls_dir, file)
            print(f"Applying {path}...")
            with open(path) as f:
                sql = f.read()
            # NOTE: naive `;` splitting breaks on function bodies — prefer
            # scripts/apply_all_rls.py which is dollar-quote aware.
            for stmt in (s.strip() for s in sql.split(";") if s.strip()):
                await conn.execute(text(stmt))

    await engine.dispose()
    print("RLS applied successfully.")


if __name__ == "__main__":
    asyncio.run(apply_rls())
