import asyncio
from sqlalchemy import text
from apps.api.core.database import async_session_maker

async def main():
    async with async_session_maker() as session:
        await session.execute(text("UPDATE alembic_version SET version_num = '46a1e8a5a2f2'"))
        await session.commit()
        print("Reverted alembic_version!")
            
if __name__ == "__main__":
    asyncio.run(main())
