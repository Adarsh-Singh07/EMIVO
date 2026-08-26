import asyncio
from sqlalchemy import text, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from modules.catalogues.models import ProductCatalogue

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres.mpwllyouzvnqupwmlmaz:Ajeet8651%40%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres", echo=True)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        await session.execute(text("SET LOCAL ROLE emivo_app;"))
        await session.execute(text("SET LOCAL app.business_id = '7332975d-b6e3-46a7-ac73-a7d469e5462e';"))
        
        res = await session.execute(
            select(ProductCatalogue).where(
                ProductCatalogue.id == '7e5251b4-01a8-4041-b384-20e16b05739a',
            )
        )
        cat = res.scalar_one_or_none()
        if cat:
            print("Found:", cat.title)
            cat.title = 'Test 2'
            await session.commit()
            print("Updated!")
        else:
            print("Not found")

asyncio.run(main())
