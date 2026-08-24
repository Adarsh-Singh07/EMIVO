import asyncio
from passlib.hash import argon2
import asyncpg
import os

async def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres.mpwllyouzvnqupwmlmaz:Ajeet8651%40%40@aws-0-ap-south-1.pooler.supabase.com:6543/postgres").replace("+asyncpg", "")
    conn = await asyncpg.connect(db_url)
    hashed_pw = argon2.hash("Admin@123")
    await conn.execute("UPDATE users SET password_hash = $1 WHERE email = 'admin@elektrix.in'", hashed_pw)
    print("Password for admin@elektrix.in has been reset to Admin@123")
    await conn.close()

asyncio.run(main())
