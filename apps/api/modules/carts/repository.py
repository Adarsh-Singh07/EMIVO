from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.carts.models import Cart, CartItem
from modules.carts.schemas import CartCreate, CartItemCreate


class CartRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, cart_id: str) -> Optional[Cart]:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .execution_options(populate_existing=True)
            .where(Cart.id == str(cart_id))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: str) -> Optional[Cart]:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .execution_options(populate_existing=True)
            .where(Cart.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_session(self, session_id: str) -> Optional[Cart]:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .execution_options(populate_existing=True)
            .where(Cart.session_id == session_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, cart_data: CartCreate, business_id: str) -> Cart:
        db_cart = Cart(
            business_id=business_id,
            user_id=cart_data.user_id,
            session_id=cart_data.session_id,
            subtotal=0,
        )
        self.db.add(db_cart)
        await self.db.flush()
        return db_cart

    async def add_item(self, cart_id: str, item: CartItemCreate) -> CartItem:
        db_item = CartItem(
            cart_id=cart_id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            quantity=item.quantity,
        )
        self.db.add(db_item)
        await self.db.flush()
        return db_item

    async def get_item(self, cart_id: str, item_id: str) -> Optional[CartItem]:
        stmt = select(CartItem).where(
            CartItem.cart_id == cart_id,
            CartItem.id == item_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_item_by_product(
        self, cart_id: str, product_id: str, variant_id: Optional[str]
    ) -> Optional[CartItem]:
        stmt = select(CartItem).where(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product_id,
            CartItem.variant_id == variant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_item_quantity(self, item_id: str, quantity: int) -> Optional[CartItem]:
        stmt = select(CartItem).where(CartItem.id == item_id)
        result = await self.db.execute(stmt)
        item = result.scalar_one_or_none()

        if item:
            item.quantity = quantity
            await self.db.flush()

        return item

    async def remove_item(self, item_id: str) -> None:
        stmt = select(CartItem).where(CartItem.id == item_id)
        result = await self.db.execute(stmt)
        item = result.scalar_one_or_none()

        if item:
            await self.db.delete(item)
            await self.db.flush()

    async def update_subtotal(self, cart_id: str, subtotal: int) -> None:
        stmt = select(Cart).where(Cart.id == cart_id)
        result = await self.db.execute(stmt)
        cart = result.scalar_one_or_none()

        if cart:
            cart.subtotal = subtotal
            await self.db.flush()

    async def clear(self, cart_id: str) -> None:
        stmt = select(CartItem).where(CartItem.cart_id == cart_id)
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        for item in items:
            await self.db.delete(item)

        stmt2 = select(Cart).where(Cart.id == cart_id)
        result2 = await self.db.execute(stmt2)
        cart = result2.scalar_one_or_none()
        if cart:
            cart.subtotal = 0

        await self.db.flush()
