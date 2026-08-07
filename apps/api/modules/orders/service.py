import uuid

from core.database import tenant_context
from core.exceptions import DomainException
from modules.orders.models import Order, OrderItem, OrderStatus, OutboxEvent
from modules.orders.repository import OrderRepository
from modules.orders.schemas import OrderCreate, OrderStatusUpdate

# We would normally import product service to validate products and get prices
# For now, we mock the product retrieval logic


class OrderService:
    def __init__(self, repo: OrderRepository):
        self.repo = repo

    async def _get_product_price_and_name(
        self, product_id: str, variant_id: str | None = None
    ) -> tuple[int, str, str | None]:
        # MOCK IMPLEMENTATION: In reality, we'd call ProductService or DB
        # Returns: (unit_price_in_minor_units, product_name, variant_name)
        price_in_minor_units = 100000  # ?1000.00
        product_name = f"Product {product_id[:8]}"
        variant_name = f"Variant {variant_id[:8]}" if variant_id else None
        return price_in_minor_units, product_name, variant_name

    async def create_order(self, user_id: str, data: OrderCreate) -> Order:
        business_id = tenant_context.get()
        if not business_id:
            raise DomainException(
                message="Business context required", code="MISSING_TENANT"
            )

        # Idempotency check
        existing_order = await self.repo.get_by_idempotency_key(data.idempotency_key)
        if existing_order:
            if existing_order.user_id != user_id:
                raise DomainException(
                    message="Idempotency key collision", code="IDEMPOTENCY_CONFLICT"
                )
            return existing_order

        # Create Order Items and calculate totals
        order_items = []
        subtotal = 0

        for item_m in data.items:
            unit_price, p_name, v_name = await self._get_product_price_and_name(
                item_m.product_id, item_m.variant_id
            )
            item_total = unit_price * item_m.quantity

            oi = OrderItem(
                product_id=item_m.product_id,
                variant_id=item_m.variant_id,
                quantity=item_m.quantity,
                unit_price=unit_price,
                subtotal=item_total,
                tax=0,  # Simplified
                total=item_total,
                product_name=p_name,
                variant_name=v_name,
            )
            order_items.append(oi)
            subtotal += item_total

        # Build order
        order = Order(
            user_id=user_id,
            idempotency_key=data.idempotency_key,
            subtotal=subtotal,
            tax_total=0,
            shipping_total=0,  # Simplified
            discount_total=0,
            total=subtotal,
            currency="INR",
            shipping_address=data.shipping_address.model_dump(),
            billing_address=data.billing_address.model_dump()
            if data.billing_address
            else None,
            metadata_info=data.metadata_info,
            status=OrderStatus.PENDING,
            items=order_items,
        )

        # We don't have the order_id until creation in a real DB without default uuid set
        # But we use lambda: str(uuid.uuid4()) so generating it now is fine if it wasn't
        order.id = str(uuid.uuid4())
        for item in order_items:
            item.order_id = order.id

        # Prepare outbox event for OrderPlaced
        event_payload = {
            "order_id": order.id,
            "user_id": user_id,
            "business_id": business_id,
            "total": order.total,
            "currency": order.currency,
            "items_count": len(order_items),
        }

        event = OutboxEvent(
            aggregate_type="Order",
            aggregate_id=order.id,
            type="OrderPlaced",
            payload=event_payload,
        )

        return await self.repo.create(order, outbox_event=event)

    async def get_order(self, order_id: str, user_id: str) -> Order:
        order = await self.repo.get_by_id(order_id)
        if not order or order.user_id != user_id:
            raise DomainException(
                message="Order not found", code="NOT_FOUND", status_code=404
            )
        return order

    async def get_user_orders(
        self, user_id: str, limit: int = 20, offset: int = 0
    ) -> list[Order]:
        return await self.repo.list_by_user(user_id, limit, offset)

    async def update_status(
        self, order_id: str, user_id: str, update_data: OrderStatusUpdate
    ) -> Order:
        order = await self.get_order(order_id, user_id)

        # Valid state transitions checking omitted for brevity
        old_status = order.status
        order.status = update_data.status

        event_payload = {
            "order_id": order.id,
            "old_status": old_status.value,
            "new_status": order.status.value,
            "reason": update_data.reason,
        }

        event = OutboxEvent(
            aggregate_type="Order",
            aggregate_id=order.id,
            type="OrderStatusChanged",
            payload=event_payload,
        )

        return await self.repo.update(order, outbox_event=event)
