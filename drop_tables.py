import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from core.models import Base

# all models need to be imported so Base knows them
from modules.businesses.models import Business
from modules.users.models import User
from modules.products.models import Product, ProductVariant, ProductMedia, Category
from modules.orders.models import Order, OrderItem
from modules.customers.models import Customer
from modules.carts.models import Cart, CartItem
from modules.coupons.models import Coupon, CouponUsage
from modules.payments.models import Payment, PaymentEvent
from modules.search.models import ProductEmbedding

async def drop_tables():
    engine = create_async_engine("postgresql+asyncpg://postgres:Ujjwal8651%23@db.mpwllyouzvnqupwmlmaz.supabase.co:5432/postgres")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    print("Tables dropped.")

asyncio.run(drop_tables())
