import asyncio
from sqlalchemy import text
from apps.api.core.database import async_session_maker

async def main():
    async with async_session_maker() as session:
        # Check if columns exist, if not add them
        try:
            await session.execute(text("ALTER TABLE categories ADD COLUMN icon VARCHAR(255) DEFAULT NULL"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE categories ADD COLUMN keywords VARCHAR(500) DEFAULT NULL"))
        except Exception:
            pass
        await session.commit()
        print("Category columns added directly to DB")
            
if __name__ == "__main__":
    asyncio.run(main())
