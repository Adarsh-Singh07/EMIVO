from typing import Optional, Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.carts.models import Cart, CartItem
from modules.carts.repository import CartRepository
from modules.carts.schemas import CartCreate, CartItemCreate, CartItemUpdate, CartResponse, CartItemResponse
from modules.orders.pricing import effective_price
from modules.products.models import Product, ProductStatus, ProductVariant
from modules.products.repository import ProductRepository


class CartService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = CartRepository(db)
        self.product_repository = ProductRepository(db)

    async def _get_current_business_id(self) -> str:
        res = await self.db.execute(
            text("SELECT NULLIF(current_setting('app.business_id', true), '')")
        )
        current_b_id = res.scalar()
        if not current_b_id:
            raise DomainException(
                "Tenant context missing or invalid",
                code="UNAUTHORIZED",
                status_code=401
            )
        return str(current_b_id)

    async def _get_product_and_variant(
        self, product_id: str, variant_id: Optional[str]
    ) -> Tuple[Optional[Product], Optional[ProductVariant]]:
        product = await self.product_repository.get_by_id(product_id)
        if not product:
            return None, None

        variant = None
        if variant_id:
            variant = next(
                (v for v in product.variants if v.id == variant_id),
                None
            )

        return product, variant

    async def _calculate_subtotal(self, cart: Cart) -> int:
        """Calculate cart subtotal in minor units based on current database prices."""
        total = 0
        for item in cart.items:
            product, variant = await self._get_product_and_variant(
                item.product_id, item.variant_id
            )
            if not product:
                continue

            unit_price = variant.price if variant else effective_price(product)
            total += unit_price * item.quantity

        return total

    async def _available_stock(self, product_id: str) -> Optional[int]:
        res = await self.db.execute(
            text("SELECT on_hand - reserved FROM inventory WHERE product_id = :pid"),
            {"pid": product_id},
        )
        return res.scalar()

    async def _build_cart_response(self, cart: Cart) -> CartResponse:
        items_resp = []
        stock_map: dict = {}
        if cart.items:
            res = await self.db.execute(
                text("SELECT product_id, on_hand - reserved AS available FROM inventory WHERE product_id = ANY(:ids)"),
                {"ids": [i.product_id for i in cart.items]},
            )
            stock_map = {pid: avail for pid, avail in res}

        for item in cart.items:
            product, variant = await self._get_product_and_variant(
                item.product_id, item.variant_id
            )
            unit_price = (variant.price if variant else effective_price(product)) if product else 0
            subtotal = unit_price * item.quantity

            items_resp.append(CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=unit_price,
                subtotal=subtotal,
                product_name=product.name if product else None,
                variant_name=variant.name if variant else None,
                stock_available=stock_map.get(item.product_id),
                created_at=item.created_at,
                updated_at=item.updated_at
            ))

        subtotal = sum(i.subtotal for i in items_resp)
        return CartResponse(
            id=cart.id,
            business_id=cart.business_id,
            user_id=cart.user_id,
            session_id=cart.session_id,
            subtotal=subtotal,
            expires_at=cart.expires_at,
            items=items_resp,
            created_at=cart.created_at,
            updated_at=cart.updated_at
        )

    async def get_or_create_cart(
        self, user_id: Optional[str] = None, session_id: Optional[str] = None
    ) -> CartResponse:
        business_id = await self._get_current_business_id()

        if not user_id and not session_id:
            raise DomainException(
                "Either user_id or session_id must be provided",
                code="BAD_REQUEST",
                status_code=400
            )

        cart = None
        if user_id:
            cart = await self.repository.get_by_user(user_id)

        if not cart and session_id:
            cart = await self.repository.get_by_session(session_id)

        if not cart:
            cart_data = CartCreate(user_id=user_id, session_id=session_id)
            created = await self.repository.create(cart_data, business_id)
            cart_id = str(created.id)
            await self.db.commit()
            cart = await self.repository.get_by_id(cart_id)

        return await self._build_cart_response(cart)

    async def get_cart(self, cart_id: str) -> CartResponse:
        cart = await self.repository.get_by_id(cart_id)
        if not cart:
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)
        return await self._build_cart_response(cart)

    async def add_item(self, cart_id: str, item_data: CartItemCreate) -> CartResponse:
        cart = await self.repository.get_by_id(cart_id)
        if not cart:
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)

        product, variant = await self._get_product_and_variant(
            item_data.product_id, item_data.variant_id
        )

        if not product:
            raise DomainException("Product not found", code="NOT_FOUND", status_code=404)
        if product.status != ProductStatus.ACTIVE:
            raise DomainException(
                f"'{product.name}' is no longer available",
                code="PRODUCT_UNAVAILABLE", status_code=409,
            )
        if item_data.variant_id and not variant:
            raise DomainException("Variant not found", code="NOT_FOUND", status_code=404)

        # Live stock validation (best-effort guard; checkout is authoritative)
        available = await self._available_stock(item_data.product_id)
        existing_item = await self.repository.get_item_by_product(
            cart_id, item_data.product_id, item_data.variant_id
        )
        requested = item_data.quantity + (existing_item.quantity if existing_item else 0)
        if available is not None and requested > available:
            raise DomainException(
                f"Only {available} left in stock" if available > 0 else "Out of stock",
                code="INSUFFICIENT_STOCK", status_code=409,
            )

        if existing_item:
            await self.repository.update_item_quantity(existing_item.id, requested)
        else:
            await self.repository.add_item(cart_id, item_data)

        await self.db.commit()

        # Re-fetch cart with selectinload to update items & subtotal
        updated_cart = await self.repository.get_by_id(cart_id)
        subtotal = await self._calculate_subtotal(updated_cart)
        await self.repository.update_subtotal(cart_id, subtotal)
        await self.db.commit()

        refreshed = await self.repository.get_by_id(cart_id)
        return await self._build_cart_response(refreshed)

    async def update_item_quantity(
        self, cart_id: str, item_id: str, update_data: CartItemUpdate
    ) -> CartResponse:
        cart = await self.repository.get_by_id(cart_id)
        if not cart:
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)

        item = await self.repository.get_item(cart_id, item_id)
        if not item:
            raise DomainException("Item not found in cart", code="NOT_FOUND", status_code=404)

        available = await self._available_stock(item.product_id)
        if update_data.quantity > 0 and available is not None and update_data.quantity > available:
            raise DomainException(
                f"Only {available} left in stock" if available > 0 else "Out of stock",
                code="INSUFFICIENT_STOCK", status_code=409,
            )

        if update_data.quantity <= 0:
            await self.repository.remove_item(item_id)
        else:
            await self.repository.update_item_quantity(item_id, update_data.quantity)
        await self.db.commit()

        updated_cart = await self.repository.get_by_id(cart_id)
        subtotal = await self._calculate_subtotal(updated_cart)
        await self.repository.update_subtotal(cart_id, subtotal)
        await self.db.commit()

        refreshed = await self.repository.get_by_id(cart_id)
        return await self._build_cart_response(refreshed)

    async def remove_item(self, cart_id: str, item_id: str) -> CartResponse:
        cart = await self.repository.get_by_id(cart_id)
        if not cart:
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)

        item = await self.repository.get_item(cart_id, item_id)
        if not item:
            raise DomainException("Item not found in cart", code="NOT_FOUND", status_code=404)

        await self.repository.remove_item(item_id)
        await self.db.commit()

        updated_cart = await self.repository.get_by_id(cart_id)
        subtotal = await self._calculate_subtotal(updated_cart)
        await self.repository.update_subtotal(cart_id, subtotal)
        await self.db.commit()

        refreshed = await self.repository.get_by_id(cart_id)
        return await self._build_cart_response(refreshed)

    async def clear_cart(self, cart_id: str) -> CartResponse:
        cart = await self.repository.get_by_id(cart_id)
        if not cart:
            raise DomainException("Cart not found", code="NOT_FOUND", status_code=404)

        await self.repository.clear(cart_id)
        await self.db.commit()

        refreshed = await self.repository.get_by_id(cart_id)
        return await self._build_cart_response(refreshed)

    async def merge_guest_cart(self, user_id: str, session_id: str) -> CartResponse:
        """Merge the guest session cart into the user's cart after login.
        Same-product quantities add up (stock-checked); the guest cart is
        emptied afterwards."""
        business_id = await self._get_current_business_id()
        guest_cart = await self.repository.get_by_session(session_id)
        user_cart = await self.repository.get_by_user(user_id)

        if not user_cart:
            user_cart = await self.repository.create(
                CartCreate(user_id=user_id), business_id
            )
            await self.db.commit()

        if guest_cart and guest_cart.id != user_cart.id and guest_cart.items:
            for g_item in guest_cart.items:
                existing = await self.repository.get_item_by_product(
                    str(user_cart.id), g_item.product_id, g_item.variant_id
                )
                target_qty = g_item.quantity + (existing.quantity if existing else 0)
                available = await self._available_stock(g_item.product_id)
                if available is not None:
                    target_qty = min(target_qty, available)
                if target_qty <= 0:
                    continue
                if existing:
                    await self.repository.update_item_quantity(existing.id, target_qty)
                else:
                    await self.repository.add_item(
                        str(user_cart.id),
                        CartItemCreate(
                            product_id=g_item.product_id,
                            variant_id=g_item.variant_id,
                            quantity=target_qty,
                        ),
                    )
            await self.repository.clear(str(guest_cart.id))
            await self.db.commit()

        updated = await self.repository.get_by_id(str(user_cart.id))
        subtotal = await self._calculate_subtotal(updated)
        await self.repository.update_subtotal(str(user_cart.id), subtotal)
        await self.db.commit()
        refreshed = await self.repository.get_by_id(str(user_cart.id))
        return await self._build_cart_response(refreshed)
