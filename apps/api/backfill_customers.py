import asyncio
import os
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.begin() as conn:
        bid = (await conn.execute(text("SELECT id FROM businesses LIMIT 1"))).scalar()
        if not bid:
            print("No business found")
            return
            
        users = await conn.execute(text("SELECT email, first_name, last_name, phone FROM users"))
        for user in users.fetchall():
            name = f"{user.first_name} {user.last_name}".strip()
            await conn.execute(text("""
                INSERT INTO customers (id, business_id, name, email, phone)
                VALUES (:id, :bid, :name, :email, :phone)
                ON CONFLICT (business_id, email) DO NOTHING
            """), {
                "id": str(uuid.uuid4()), "bid": bid, "name": name, 
                "email": user.email, "phone": user.phone
            })
        print("Backfill complete")
        
if __name__ == "__main__":
    asyncio.run(main())
