from apps.api.modules.orders.schemas import PaginatedOrdersResponse, PaginatedOrdersResponseV2, OrderResponse, OrderResponseV2
from datetime import datetime

items = [
    OrderResponse(
        id="123", user_id="u1", business_id="b1", status="PENDING", idempotency_key="key",
        subtotal=0, tax_total=0, shipping_total=0, discount_total=0, total=0, currency="INR",
        shipping_address={}, created_at=datetime.now(), updated_at=datetime.now(), items=[]
    )
]
resp = PaginatedOrdersResponse(items=items, total=1, page=1, page_size=20, has_next=False, has_prev=False)

try:
    PaginatedOrdersResponseV2.model_validate(resp)
    print("Success")
except Exception as e:
    print("Error:", e)
