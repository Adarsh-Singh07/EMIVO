import secrets
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from core.models import OutboxEvent
from core.store import get_store_settings
from modules.carts.repository import CartRepository
from modules.customers.repository import CustomerRepository
from modules.inventory.service import InventoryService
from modules.orders.models import Order, OrderItem, OrderStatus
from modules.orders.pricing import effective_price
from modules.orders.repository import OrderRepository
from modules.orders.schemas import (
    CheckoutRequest,
    OrderCreate,
    OrderResponse,
    OrderResponseV2,
    OrderStatusUpdate,
    PaginatedOrdersResponse,
    PaginatedOrdersResponseV2,
)
from modules.products.models import ProductStatus
from modules.products.repository import ProductRepository
from modules.users.models import User


# Allowed Order Status Transitions
VALID_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.PAYMENT_FAILED},
    OrderStatus.PAYMENT_PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.PAYMENT_FAILED},
    OrderStatus.PAYMENT_FAILED: {OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.PACKED, OrderStatus.CANCELLED},
    OrderStatus.PACKED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED, OrderStatus.CANCELLED},
    OrderStatus.DELIVERED: {OrderStatus.REFUNDED},
    OrderStatus.CANCELLED: set(),
    OrderStatus.REFUNDED: set(),
}


class OrderService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = OrderRepository(session)
        self.product_repo = ProductRepository(session)
        self.customer_repo = CustomerRepository(session)
        self.inventory = InventoryService(session)
        self.cart_repo = CartRepository(session)

    async def _get_current_business_id(self) -> str:
        res = await self.session.execute(
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

    # ------------------------------------------------------------------ #
    # Checkout — the ONLY customer path for creating orders              #
    # ------------------------------------------------------------------ #

    async def _generate_order_number(self) -> str:
        stamp = datetime.now(timezone.utc).strftime("%y%m%d")
        for _ in range(6):
            candidate = f"ELK-{stamp}-{secrets.token_hex(3).upper()}"
            res = await self.session.execute(
                text("SELECT 1 FROM orders WHERE order_number = :n"), {"n": candidate}
            )
            if res.scalar() is None:
                return candidate
        raise DomainException(
            "Could not allocate order number", code="ORDER_NUMBER_EXHAUSTED", status_code=500
        )

    async def _resolve_checkout_address(
        self, data: CheckoutRequest, user: User
    ) -> dict:
        if data.address_id:
            from sqlalchemy import select
            from modules.addresses.models import Address

            res = await self.session.execute(
                select(Address).where(
                    Address.id == data.address_id, Address.user_id == str(user.id)
                )
            )
            addr = res.scalar_one_or_none()
            if not addr:
                raise DomainException(
                    "Address not found", code="NOT_FOUND", status_code=404
                )
            return {
                "full_name": addr.full_name, "phone": addr.phone,
                "line1": addr.line1, "line2": addr.line2, "city": addr.city,
                "state": addr.state, "pincode": addr.pincode, "country": addr.country,
            }
        if data.shipping_address:
            return data.shipping_address.model_dump()
        raise DomainException(
            "A shipping address is required (address_id or shipping_address)",
            code="BAD_REQUEST", status_code=400,
        )

    async def checkout(self, data: CheckoutRequest, current_user: User) -> Tuple[Order, bool]:
        """Transactionally convert a cart (or explicit items) into an order.

        Guarantees (all inside ONE database transaction):
          - items/prices resolved from the DB at effective price (never client input)
          - stock reserved atomically; oversell impossible (guard inside UPDATE)
          - coupon validated + redeemed atomically (row lock + guarded increment)
          - server-computed totals with shipping rules and COD fees
          - order number allocated, address snapshotted, outbox event written
          - cart cleared on success

        Returns (order, payment_required). ONLINE payments are initiated by the
        router AFTER this commit (provider HTTP calls stay out of the tx).
        """
        business_id = await self._get_current_business_id()

        # Idempotent replay: same key returns the existing order
        if data.idempotency_key:
            existing = await self.repository.get_by_idempotency_key(data.idempotency_key)
            if existing:
                return existing, existing.payment_method == "ONLINE" and existing.status == OrderStatus.PENDING

        store_cfg = await get_store_settings(self.session)

        # ---- Resolve line items -------------------------------------------
        line_items: List[Tuple[str, Optional[str], int]] = []
        used_cart_id: Optional[str] = None

        if data.items:
            for it in data.items:
                line_items.append((it.product_id, it.variant_id, it.quantity))
        else:
            cart = await self.cart_repo.get_by_user(str(current_user.id))
            if not cart or not cart.items:
                raise DomainException(
                    "Your cart is empty", code="CART_EMPTY", status_code=400
                )
            used_cart_id = str(cart.id)
            for item in cart.items:
                line_items.append((item.product_id, item.variant_id, item.quantity))

        # ---- Price resolution from DB -------------------------------------
        subtotal = 0
        order_items: List[OrderItem] = []
        products_by_id = {}

        for product_id, variant_id, quantity in line_items:
            product = await self.product_repo.get_by_id(product_id)
            if not product or product.business_id != business_id:
                raise DomainException(
                    f"Product {product_id} is not available", code="NOT_FOUND", status_code=404
                )
            if product.status != ProductStatus.ACTIVE:
                raise DomainException(
                    f"'{product.name}' is no longer available", code="PRODUCT_UNAVAILABLE", status_code=409
                )
            products_by_id[product_id] = product

            unit_price = effective_price(product)
            variant_name = None
            if variant_id:
                variant = next((v for v in product.variants if v.id == variant_id), None)
                if not variant:
                    raise DomainException(
                        f"Variant {variant_id} not found for product {product.id}",
                        code="NOT_FOUND", status_code=404,
                    )
                unit_price = variant.price
                variant_name = variant.name

            line_subtotal = unit_price * quantity
            subtotal += line_subtotal
            order_items.append(OrderItem(
                product_id=product.id,
                variant_id=variant_id,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=line_subtotal,
                tax=0,  # GST-inclusive pricing
                total=line_subtotal,
                product_name=product.name,
                variant_name=variant_name,
            ))

        # ---- Shipping / COD rules ------------------------------------------
        free_threshold = store_cfg["free_shipping_threshold_paise"]
        flat_shipping = store_cfg["flat_shipping_paise"]
        shipping_total = 0 if (free_threshold and subtotal >= free_threshold) else (flat_shipping or 0)

        cod_fee = 0
        if data.payment_method == "COD":
            if not store_cfg["cod_enabled"]:
                raise DomainException(
                    "Cash on Delivery is currently unavailable",
                    code="COD_DISABLED", status_code=400,
                )
            cod_max = store_cfg["cod_max_order_paise"]
            if cod_max and subtotal > cod_max:
                raise DomainException(
                    f"Cash on Delivery is unavailable for orders above ₹{cod_max / 100:,.0f}",
                    code="COD_LIMIT", status_code=400,
                )
            cod_fee = store_cfg["cod_fee_paise"] or 0

        # ---- Create the order (flush allocates id + order number) -----------
        total = subtotal + shipping_total + cod_fee
        idempotency_key = data.idempotency_key or f"checkout_{uuid.uuid4().hex}"
        order_number = await self._generate_order_number()
        shipping_address = await self._resolve_checkout_address(data, current_user)

        order = Order(
            user_id=str(current_user.id),
            customer_id=None,
            business_id=business_id,
            # ONLINE orders await payment in PENDING; COD orders are accepted
            # immediately (stock reserved, committed at DELIVERED).
            status=OrderStatus.CONFIRMED if data.payment_method == "COD" else OrderStatus.PENDING,
            idempotency_key=idempotency_key,
            order_number=order_number,
            payment_method=data.payment_method,
            coupon_code=None,
            tracking_number=order_number,
            subtotal=subtotal,
            tax_total=0,  # GST-inclusive pricing
            shipping_total=shipping_total + cod_fee,
            discount_total=0,
            total=total,
            currency="INR",
            shipping_address=shipping_address,
            billing_address=None,
            notes=data.notes,
            items=order_items,
        )
        await self.repository.create(order)  # flush → order.id + items persisted in-tx

        # ---- Coupon redemption (atomic, inside this transaction) -------------
        discount_total = 0
        coupon_code = None
        if data.coupon_code:
            from modules.coupons.service import CouponService

            coupon_service = CouponService(self.session)
            coupon, discount_total = await coupon_service.redeem_for_order(
                code=data.coupon_code,
                user_id=str(current_user.id),
                cart_subtotal=subtotal,
                order_id=str(order.id),
            )
            coupon_code = coupon["code"]
            total = max(subtotal - discount_total + shipping_total + cod_fee, 0)
            order.coupon_code = coupon_code
            order.discount_total = discount_total
            order.total = total
            await self.repository.update(order)

        # ---- Reserve stock (atomic; raises OUT_OF_STOCK → full rollback) ----
        await self.inventory.reserve_for_order(order, order_items)

        # ---- Domain event for notifications ----------------------------------
        self.session.add(OutboxEvent(
            tenant_id=business_id,
            type="order.created",
            payload={
                "order_id": str(order.id),
                "order_number": order_number,
                "user_id": str(current_user.id),
                "email": current_user.email,
                "first_name": current_user.first_name,
                "total": total,
                "payment_method": data.payment_method,
                "items": [
                    {"name": i.product_name, "qty": i.quantity, "unit_price": i.unit_price}
                    for i in order_items
                ],
                "shipping_address": shipping_address,
            },
        ))

        await self.session.commit()

        # ---- Clear the consumed cart ------------------------------------------
        if used_cart_id:
            try:
                await self.cart_repo.clear(used_cart_id)
                await self.session.commit()
            except Exception:  # cart cleanup must never fail checkout
                pass

        payment_required = data.payment_method == "ONLINE"
        fetched = await self.repository.get_by_id(order.id)
        return fetched or order, payment_required

    async def create_order(self, data: OrderCreate, current_user: User) -> Order:
        business_id = await self._get_current_business_id()

        # Check idempotency key if provided
        if data.idempotency_key:
            existing = await self.repository.get_by_idempotency_key(data.idempotency_key)
            if existing:
                return existing

        # Validate customer if provided
        if data.customer_id:
            customer = await self.customer_repo.get_by_id(data.customer_id)
            if not customer:
                raise DomainException(
                    f"Customer {data.customer_id} not found",
                    code="NOT_FOUND",
                    status_code=404
                )

        # Validate items and calculate totals
        total_amount = 0
        order_items = []

        for item_req in data.items:
            product = await self.product_repo.get_by_id(item_req.product_id)
            if not product:
                raise DomainException(
                    f"Product {item_req.product_id} not found",
                    code="NOT_FOUND",
                    status_code=404
                )

            unit_price = product.price
            variant_name = None

            if item_req.variant_id:
                variant = next(
                    (v for v in product.variants if v.id == item_req.variant_id),
                    None
                )
                if not variant:
                    raise DomainException(
                        f"Variant {item_req.variant_id} not found for product {product.id}",
                        code="NOT_FOUND",
                        status_code=404
                    )
                unit_price = variant.price
                variant_name = variant.name

            subtotal = unit_price * item_req.quantity
            total_amount += subtotal

            order_item = OrderItem(
                product_id=product.id,
                variant_id=item_req.variant_id,
                quantity=item_req.quantity,
                unit_price=unit_price,
                subtotal=subtotal,
                tax=0,
                total=subtotal,
                product_name=product.name,
                variant_name=variant_name
            )
            order_items.append(order_item)

        idempotency_key = data.idempotency_key or f"ord_{uuid.uuid4().hex}"
        order_number = await self._generate_order_number()

        order = Order(
            user_id=current_user.id,
            customer_id=data.customer_id,
            business_id=business_id,
            status=OrderStatus.PENDING,
            idempotency_key=idempotency_key,
            order_number=order_number,
            tracking_number=order_number,
            subtotal=total_amount,
            tax_total=0,
            shipping_total=0,
            discount_total=0,
            total=total_amount,
            currency="INR",
            shipping_address=data.shipping_address.model_dump() if data.shipping_address else {},
            billing_address=data.billing_address.model_dump() if data.billing_address else None,
            notes=data.notes,
            metadata_info=data.metadata_info,
            items=order_items
        )

        await self.repository.create(order)
        await self.session.commit()
        
        # Re-fetch order with items eager-loaded
        fetched = await self.repository.get_by_id(order.id)
        return fetched or order

    async def list_orders(
        self,
        status: Optional[OrderStatus] = None,
        customer_id: Optional[str] = None,
        user_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> PaginatedOrdersResponseV2:
        orders, total = await self.repository.list_orders(
            status=status,
            customer_id=customer_id,
            user_id=user_id,
            page=page,
            page_size=page_size
        )

        items_resp = [OrderResponseV2.model_validate(o) for o in orders]
        has_next = (page * page_size) < total
        has_prev = page > 1

        return PaginatedOrdersResponseV2(
            items=items_resp,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_prev=has_prev
        )

    async def get_order(self, order_id: str) -> Order:
        order = await self.repository.get_by_id(order_id)
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)
        return order

    async def update_order_status(
        self,
        order_id: str,
        status_update: OrderStatusUpdate
    ) -> Order:
        """Staff order-state machine with commerce side effects:
        SHIPPED → timestamp + tracking + email; DELIVERED → COD stock commit +
        email; CANCELLED → reservation release / restock + email."""
        order = await self.get_order(order_id)
        target_status = status_update.status

        if target_status != order.status:
            allowed = VALID_TRANSITIONS.get(order.status, set())
            if target_status not in allowed:
                raise DomainException(
                    f"Cannot transition order from {order.status.value} to {target_status.value}",
                    code="INVALID_STATE_TRANSITION",
                    status_code=400
                )
            order.status = target_status

        if status_update.reason:
            meta = dict(order.metadata_info or {})
            meta["status_reason"] = status_update.reason
            meta["status_updated_at"] = datetime.now(timezone.utc).isoformat()
            order.metadata_info = meta

        event_type = None
        if target_status == OrderStatus.PACKED:
            event_type = "order.packed"
        elif target_status == OrderStatus.SHIPPED:
            order.shipped_at = order.shipped_at or datetime.now(timezone.utc)
            if status_update.tracking_number:
                order.tracking_number = status_update.tracking_number
            if status_update.tracking_url:
                order.tracking_url = status_update.tracking_url
            event_type = "order.shipped"
        elif target_status == OrderStatus.OUT_FOR_DELIVERY:
            event_type = "order.out_for_delivery"
        elif target_status == OrderStatus.DELIVERED:
            order.delivered_at = order.delivered_at or datetime.now(timezone.utc)
            # COD orders commit stock on delivery
            if order.payment_method == "COD" and not order.stock_committed:
                await self.inventory.commit_for_order(order)
            event_type = "order.delivered"
        elif target_status == OrderStatus.CANCELLED:
            if order.stock_committed:
                await self.inventory.restock_for_order(order)
            else:
                await self.inventory.release_for_order(order)
            event_type = "order.cancelled"
        elif target_status == OrderStatus.REFUNDED and order.stock_committed:
            await self.inventory.restock_for_order(order)

        if event_type:
            self.session.add(OutboxEvent(
                tenant_id=order.business_id,
                type=event_type,
                payload={
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "user_id": str(order.user_id),
                    "tracking_number": order.tracking_number,
                    "tracking_url": order.tracking_url,
                },
            ))

        await self.repository.update(order)
        await self.session.commit()
        return await self.get_order(order_id)

    async def update_order_notes(self, order_id: str, notes: Optional[str]) -> Order:
        order = await self.get_order(order_id)
        order.notes = notes
        await self.repository.update(order)
        await self.session.commit()
        return order

    async def get_order_for_user(self, order_id: str, user: User, is_staff: bool) -> Order:
        """Ownership-checked fetch: customers see only their own orders."""
        order = await self.repository.get_by_id(order_id)
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)
        if not is_staff and str(order.user_id) != str(user.id):
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)
        return order

    async def get_order_by_number(self, order_number: str, user: User, is_staff: bool) -> Order:
        res = await self.session.execute(
            select(Order).where(
                Order.order_number == order_number, Order.deleted_at.is_(None)
            )
        )
        order = res.scalar_one_or_none()
        if not order:
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)
        if not is_staff and str(order.user_id) != str(user.id):
            raise DomainException("Order not found", code="NOT_FOUND", status_code=404)
        fetched = await self.repository.get_by_id(order.id)
        return fetched or order

    async def delete_order(self, order_id: str) -> None:
        order = await self.get_order(order_id)
        order.deleted_at = datetime.now(timezone.utc)
        if order.status not in (OrderStatus.CANCELLED, OrderStatus.REFUNDED):
            order.status = OrderStatus.CANCELLED
            if order.stock_committed:
                await self.inventory.restock_for_order(order)
            else:
                await self.inventory.release_for_order(order)
        await self.repository.update(order)
        await self.session.commit()
