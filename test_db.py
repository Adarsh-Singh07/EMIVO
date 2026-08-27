import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
import os
from sqlalchemy import text

async def main():
    engine = create_async_engine(
        os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://"),
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0}
    )
    async with engine.connect() as conn:
        try:
            await conn.execute(text("SET LOCAL ROLE emivo_app"))
            await conn.execute(text("SET app.business_id = '7f2515ec-c52f-4f74-8b31-0c421de54dc6'"))
            query = text("""
                SELECT code, description, discount_type, discount_value, min_order_amount, max_discount_amount 
                FROM coupons 
                WHERE is_active = true 
                AND deleted_at IS NULL
                AND (start_date IS NULL OR start_date <= now()) 
                AND (end_date IS NULL OR end_date >= now())
            """)
            result = await conn.execute(query)
            print("RESULTS:", result.fetchall())
        except Exception as e:
            print("ERROR", e)

asyncio.run(main())
