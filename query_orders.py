import asyncio
import asyncpg
import os

async def main():
    conn = await asyncpg.connect("postgresql://postgres.ihemgmucjxpdpqdlxeai:Goluaj0%40123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres")
    rows = await conn.fetch("SELECT id, order_number, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 15;")
    for r in rows:
        print(dict(r))
    await conn.close()

asyncio.run(main())
