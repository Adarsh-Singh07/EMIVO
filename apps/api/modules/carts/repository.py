from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .models import Cart, CartItem
from .schemas import CartCreate, CartItemCreate


class CartRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, cart_id: str, tenant_id: str) -> Cart | None:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .where(Cart.id == cart_id, Cart.tenant_id == tenant_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_user(self, user_id: str, tenant_id: str) -> Cart | None:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .where(Cart.user_id == user_id, Cart.tenant_id == tenant_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_session(self, session_id: str, tenant_id: str) -> Cart | None:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .where(Cart.session_id == session_id, Cart.tenant_id == tenant_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, cart: CartCreate, tenant_id: str) -> Cart:
        db_cart = Cart(
            tenant_id=tenant_id,
            user_id=cart.user_id,
            session_id=cart.session_id,
            subtotal=0,
        )
        self.db.add(db_cart)
        self.db.commit()
        self.db.refresh(db_cart)
        return db_cart

    def add_item(self, cart_id: str, item: CartItemCreate) -> CartItem:
        db_item = CartItem(
            cart_id=cart_id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            quantity=item.quantity,
        )
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def get_item(self, cart_id: str, item_id: str) -> CartItem | None:
        stmt = select(CartItem).where(
            CartItem.cart_id == cart_id, CartItem.id == item_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_item_by_product(
        self, cart_id: str, product_id: str, variant_id: str | None
    ) -> CartItem | None:
        stmt = select(CartItem).where(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product_id,
            CartItem.variant_id == variant_id,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def update_item_quantity(self, item_id: str, quantity: int) -> CartItem | None:
        stmt = select(CartItem).where(CartItem.id == item_id)
        item = self.db.execute(stmt).scalar_one_or_none()

        if item:
            item.quantity = quantity
            self.db.commit()
            self.db.refresh(item)

        return item

    def remove_item(self, item_id: str):
        stmt = select(CartItem).where(CartItem.id == item_id)
        item = self.db.execute(stmt).scalar_one_or_none()

        if item:
            self.db.delete(item)
            self.db.commit()

    def update_subtotal(self, cart_id: str, subtotal: int):
        stmt = select(Cart).where(Cart.id == cart_id)
        cart = self.db.execute(stmt).scalar_one_or_none()

        if cart:
            cart.subtotal = subtotal
            self.db.commit()
            self.db.refresh(cart)

    def clear(self, cart_id: str):
        stmt = select(CartItem).where(CartItem.cart_id == cart_id)
        items = self.db.execute(stmt).scalars().all()
        for item in items:
            self.db.delete(item)

        stmt2 = select(Cart).where(Cart.id == cart_id)
        cart = self.db.execute(stmt2).scalar_one_or_none()
        if cart:
            cart.subtotal = 0

        self.db.commit()

    def delete(self, cart_id: str, tenant_id: str):
        self.clear(cart_id)
        stmt = select(Cart).where(Cart.id == cart_id, Cart.tenant_id == tenant_id)
        cart = self.db.execute(stmt).scalar_one_or_none()

        if cart:
            self.db.delete(cart)
            self.db.commit()
