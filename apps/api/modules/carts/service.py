from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..products.models import Product, ProductVariant
from ..products.repository import ProductRepository
from .models import Cart
from .repository import CartRepository
from .schemas import CartCreate, CartItemCreate, CartItemUpdate


class CartService:
    def __init__(self, db: Session):
        self.repository = CartRepository(db)
        self.product_repository = ProductRepository(db)

    def _calculate_subtotal(self, cart: Cart) -> int:
        """Calculate cart subtotal in minor integer units based on current product prices"""
        total = 0

        # We need to refresh items or query directly to get prices
        for item in cart.items:
            product, variant = self._get_product_and_variant(
                item.product_id, item.variant_id
            )
            if not product:
                continue

            price = variant.price if variant else product.price
            # Applying discount pattern similar to products
            discount = (
                variant.discount
                if variant and variant.discount
                else (product.discount or 0)
            )

            final_price = price - discount
            final_price = max(final_price, 0)

            total += final_price * item.quantity

        return total

    def _get_product_and_variant(
        self, product_id: str, variant_id: str | None
    ) -> tuple[Product | None, ProductVariant | None]:
        product = self.product_repository.get_by_id(product_id)
        if not product:
            return None, None

        variant = None
        if variant_id:
            variant = self.product_repository.get_variant(variant_id)

        return product, variant

    def get_or_create_cart(
        self, tenant_id: str, user_id: str | None = None, session_id: str | None = None
    ) -> Cart:
        if not user_id and not session_id:
            raise HTTPException(
                status_code=400, detail="Either user_id or session_id must be provided"
            )

        cart = None
        if user_id:
            cart = self.repository.get_by_user(user_id, tenant_id)

        if not cart and session_id:
            cart = self.repository.get_by_session(session_id, tenant_id)

        if not cart:
            cart_data = CartCreate(user_id=user_id, session_id=session_id)
            cart = self.repository.create(cart_data, tenant_id)

        return cart

    def get_cart(self, cart_id: str, tenant_id: str) -> Cart:
        cart = self.repository.get_by_id(cart_id, tenant_id)
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        return cart

    def add_item(self, cart_id: str, tenant_id: str, item_data: CartItemCreate) -> Cart:
        cart = self.get_cart(cart_id, tenant_id)

        # Validate product and stock
        product, variant = self._get_product_and_variant(
            item_data.product_id, item_data.variant_id
        )

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if item_data.variant_id and not variant:
            raise HTTPException(status_code=404, detail="Variant not found")

        # Check stock (simplified)
        stock = variant.stock_quantity if variant else product.stock_quantity
        if stock < item_data.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")

        # Check if item already exists
        existing_item = self.repository.get_item_by_product(
            cart_id, item_data.product_id, item_data.variant_id
        )

        if existing_item:
            new_quantity = existing_item.quantity + item_data.quantity
            if stock < new_quantity:
                raise HTTPException(
                    status_code=400, detail="Not enough stock for additional quantity"
                )
            self.repository.update_item_quantity(existing_item.id, new_quantity)
        else:
            self.repository.add_item(cart_id, item_data)

        # Recalculate subtotal
        updated_cart = self.repository.get_by_id(cart_id, tenant_id)
        subtotal = self._calculate_subtotal(updated_cart)
        self.repository.update_subtotal(cart_id, subtotal)

        return self.repository.get_by_id(cart_id, tenant_id)

    def update_item_quantity(
        self, cart_id: str, item_id: str, tenant_id: str, update_data: CartItemUpdate
    ) -> Cart:
        cart = self.get_cart(cart_id, tenant_id)

        item = self.repository.get_item(cart_id, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in cart")

        # Validate stock
        product, variant = self._get_product_and_variant(
            item.product_id, item.variant_id
        )
        if product:
            stock = variant.stock_quantity if variant else product.stock_quantity
            if stock < update_data.quantity:
                raise HTTPException(status_code=400, detail="Not enough stock")

        self.repository.update_item_quantity(item_id, update_data.quantity)

        updated_cart = self.repository.get_by_id(cart_id, tenant_id)
        subtotal = self._calculate_subtotal(updated_cart)
        self.repository.update_subtotal(cart_id, subtotal)

        return self.repository.get_by_id(cart_id, tenant_id)

    def remove_item(self, cart_id: str, item_id: str, tenant_id: str) -> Cart:
        cart = self.get_cart(cart_id, tenant_id)

        item = self.repository.get_item(cart_id, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in cart")

        self.repository.remove_item(item_id)

        updated_cart = self.repository.get_by_id(cart_id, tenant_id)
        subtotal = self._calculate_subtotal(updated_cart)
        self.repository.update_subtotal(cart_id, subtotal)

        return self.repository.get_by_id(cart_id, tenant_id)

    def clear_cart(self, cart_id: str, tenant_id: str) -> Cart:
        cart = self.get_cart(cart_id, tenant_id)
        self.repository.clear(cart_id)
        return self.repository.get_by_id(cart_id, tenant_id)
