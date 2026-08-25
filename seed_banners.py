import asyncio
from sqlalchemy import text
from apps.api.core.database import async_session_maker

async def main():
    async with async_session_maker() as session:
        await session.execute(text("""
            UPDATE business_settings 
            SET config = jsonb_set(config, '{store,hero_slides}', '[{"id": 1, "eyebrow": "New Arrival", "title": "iPhone 16 Pro", "subtitle": "Titanium. Apple Intelligence. A18 Pro chip.", "price": 119900, "mrp": 134900, "cta": "Shop iPhone 16 Pro", "link": "/product/iphone-16-pro-256gb", "img": "https://images.unsplash.com/photo-1716882173326-04d822f142a8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400", "bg": "from-neutral-100 to-neutral-200"}, {"id": 2, "eyebrow": "Powered by M3", "title": "MacBook Air M3", "subtitle": "Fast. Fanless. Fabulously light.", "price": 99900, "mrp": 114900, "cta": "Discover MacBook Air", "link": "/product/macbook-air-m3", "img": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400", "bg": "from-zinc-100 to-stone-200"}, {"id": 3, "eyebrow": "Home Cinema", "title": "Smart 4K Ultra HD TV", "subtitle": "Dolby Vision IQ & Atmos. Save 39% today.", "price": 42990, "mrp": 69990, "cta": "Upgrade Your Screen", "link": "/product/smart-tv-55", "img": "https://images.unsplash.com/photo-1577979749830-f1d742b96791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400", "bg": "from-neutral-200 to-neutral-300"}]'::jsonb);
        """))
        await session.commit()
        print("Hero slides seeded using raw SQL!")
            
if __name__ == "__main__":
    asyncio.run(main())
