import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.customers.repository import CustomerRepository
from modules.orders.models import Order, OrderItem, OrderStatus
from modules.orders.repository import OrderRepository
from modules.orders.schemas import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    PaginatedOrdersResponse,
)
from modules.products.repository import ProductRepository
from modules.users.models import User


# Allowed Order Status Transitions
VALID_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED, OrderStatus.CANCELLED},
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

        order = Order(
            user_id=current_user.id,
            customer_id=data.customer_id,
            business_id=business_id,
            status=OrderStatus.PENDING,
            idempotency_key=idempotency_key,
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
    ) -> PaginatedOrdersResponse:
        orders, total = await self.repository.list_orders(
            status=status,
            customer_id=customer_id,
            user_id=user_id,
            page=page,
            page_size=page_size
        )

        items_resp = [OrderResponse.model_validate(o) for o in orders]
        has_next = (page * page_size) < total
        has_prev = page > 1

        return PaginatedOrdersResponse(
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

        await self.repository.update(order)
        await self.session.commit()
        return await self.get_order(order_id)

    async def delete_order(self, order_id: str) -> None:
        order = await self.get_order(order_id)
        order.deleted_at = datetime.now(timezone.utc)
        if order.status not in (OrderStatus.CANCELLED, OrderStatus.REFUNDED):
            order.status = OrderStatus.CANCELLED
        await self.repository.update(order)
        await self.session.commit()
