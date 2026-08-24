import asyncio
from core.database import async_session_maker
from modules.products.models import Category
from sqlalchemy import select

async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(Category))
        categories = result.scalars().all()
        
        seen = {}
        duplicates = []
        for c in categories:
            key = (c.name.lower(), c.parent_id)
            if key in seen:
                duplicates.append(c)
            else:
                seen[key] = c
                
        for d in duplicates:
            await session.delete(d)
        
        if duplicates:
            await session.commit()
            print(f"Deleted {len(duplicates)} duplicate categories.")
        else:
            print("No duplicate categories found.")

asyncio.run(main())
