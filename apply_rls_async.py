import asyncio
import asyncpg
import sys

def get_url():
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                return line.strip().split('=', 1)[1].strip().replace('%23', '#')
    return None

async def main():
    url = get_url()
    if not url:
        print("No DATABASE_URL found.")
        sys.exit(1)
        
    try:
        conn = await asyncpg.connect(url)
        with open('db/rls/01_businesses.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
        await conn.execute(sql)
        print("✅ RLS successfully applied to Supabase!")
        await conn.close()
    except Exception as e:
        print(f"❌ Error applying RLS: {e}")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
