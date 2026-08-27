import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    staging_url = "postgresql+asyncpg://postgres.mpwllyouzvnqupwmlmaz:Ajeet8651%40%40@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    engine = create_async_engine(staging_url)
    async with engine.connect() as conn:
        print("--- USERS ---")
        users = await conn.execute(text("SELECT id, email, first_name, last_name, is_active FROM users"))
        for u in users.fetchall(): print(dict(u._mapping))
        
        print("\n--- CUSTOMERS ---")
        customers = await conn.execute(text("SELECT * FROM customers"))
        for c in customers.fetchall(): print(dict(c._mapping))
        
        print("\n--- PRODUCTS ---")
        products = await conn.execute(text("SELECT id, name, is_active FROM products LIMIT 5"))
        for p in products.fetchall(): print(dict(p._mapping))
        
        print("\n--- CATEGORIES ---")
        categories = await conn.execute(text("SELECT id, name FROM categories LIMIT 5"))
        for c in categories.fetchall(): print(dict(c._mapping))
        
        print("\n--- OFFERS ---")
        # Check if table exists
        try:
            offers = await conn.execute(text("SELECT * FROM offers LIMIT 5"))
            for o in offers.fetchall(): print(dict(o._mapping))
        except Exception as e:
            print("No offers table?", e)

        print("\n--- BANNERS ---")
        try:
            banners = await conn.execute(text("SELECT * FROM banners LIMIT 5"))
            for b in banners.fetchall(): print(dict(b._mapping))
        except Exception as e:
            print("No banners table?", e)

        print("\n--- PROMOTIONS ---")
        try:
            promos = await conn.execute(text("SELECT * FROM promotions LIMIT 5"))
            for p in promos.fetchall(): print(dict(p._mapping))
        except Exception: pass
            
asyncio.run(main())
