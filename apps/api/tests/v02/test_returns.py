"""Customer-initiated returns & refunds: 7-day window, qty limits, RLS,
seller visibility, staff workflow, PaymentService refund + restock, and outbox emails."""
import uuid

import pytest
from sqlalchemy import text

from conftest import ADDRESS, add_to_cart, get_store_products, register_and_login

pytestmark = pytest.mark.asyncio


async def _create_delivered_online_order(client, admin, buyer, qty: int = 2):
    products = await get_store_products(client, in_stock=True)
    prod = next(p for p in products["items"] if p["stock"]["available"] >= qty)
    await add_to_cart(client, buyer, prod["id"], qty)
    r = await client.post(
        "/api/v1/orders/checkout",
        headers=buyer["headers"],
        json={"shipping_address": ADDRESS, "payment_method": "ONLINE"},
    )
    assert r.status_code == 201, r.text
    order = r.json()["order"]

    # Initiate + capture payment
    r = await client.post(
        "/api/v1/payments/initiate",
        headers=buyer["headers"],
        json={
            "order_id": order["id"],
            "provider": "MOCK",
            "idempotency_key": f"retpay_{uuid.uuid4().hex}",
        },
    )
    assert r.status_code == 201, r.text
    payment = r.json()["payment"]

    r = await client.post(
        f"/api/v1/payments/{payment['id']}/verify-success",
        headers=buyer["headers"],
        json={
            "provider_payment_id": f"pay_mock_{uuid.uuid4().hex[:8]}",
            "provider_signature": "valid_mock_signature",
        },
    )
    assert r.status_code == 200, r.text

    # Ship and deliver
    r = await client.patch(
        f"/api/v1/orders/{order['id']}/status",
        headers=admin,
        json={"status": "SHIPPED", "tracking_number": "DLV12345"},
    )
    assert r.status_code == 200, r.text
    r = await client.patch(
        f"/api/v1/orders/{order['id']}/status",
        headers=admin,
        json={"status": "DELIVERED"},
    )
    assert r.status_code == 200, r.text
    return r.json(), payment, prod


async def _create_delivered_cod_order(client, admin, buyer, qty: int = 1):
    products = await get_store_products(client, in_stock=True)
    prod = next(p for p in products["items"] if p["stock"]["available"] >= qty)
    await add_to_cart(client, buyer, prod["id"], qty)
    r = await client.post(
        "/api/v1/orders/checkout",
        headers=buyer["headers"],
        json={"shipping_address": ADDRESS, "payment_method": "COD"},
    )
    assert r.status_code == 201, r.text
    order = r.json()["order"]
    r = await client.patch(
        f"/api/v1/orders/{order['id']}/status",
        headers=admin,
        json={"status": "SHIPPED", "tracking_number": "COD12345"},
    )
    assert r.status_code == 200, r.text
    r = await client.patch(
        f"/api/v1/orders/{order['id']}/status",
        headers=admin,
        json={"status": "DELIVERED"},
    )
    assert r.status_code == 200, r.text
    return r.json(), prod


async def test_return_validation_and_online_refund_flow(client, admin):
    buyer = await register_and_login(client, 950001)
    other = await register_and_login(client, 950002)

    # Non-delivered order cannot be returned
    products = await get_store_products(client, in_stock=True)
    await add_to_cart(client, buyer, products["items"][0]["id"], 1)
    cod_pending = (
        await client.post(
            "/api/v1/orders/checkout",
            headers=buyer["headers"],
            json={"shipping_address": ADDRESS, "payment_method": "COD"},
        )
    ).json()["order"]
    r = await client.post(
        f"/api/v1/orders/{cod_pending['id']}/return-requests",
        headers=buyer["headers"],
        json={
            "order_item_id": cod_pending["items"][0]["id"],
            "qty": 1,
            "reason": "DEFECTIVE",
        },
    )
    assert r.status_code == 400

    # Delivered online order (qty 2)
    order, payment, prod = await _create_delivered_online_order(client, admin, buyer, qty=2)
    item = order["items"][0]
    stock_before_return = prod["stock"]["on_hand"] - 2

    # Other buyer blocked (404 under RLS owner isolation or 403)
    r = await client.post(
        f"/api/v1/orders/{order['id']}/return-requests",
        headers=other["headers"],
        json={"order_item_id": item["id"], "qty": 1, "reason": "DAMAGED"},
    )
    assert r.status_code in (403, 404)

    # Qty > purchased rejected
    r = await client.post(
        f"/api/v1/orders/{order['id']}/return-requests",
        headers=buyer["headers"],
        json={"order_item_id": item["id"], "qty": 3, "reason": "DAMAGED"},
    )
    assert r.status_code == 409

    # Valid partial return (qty 1 of 2)
    r = await client.post(
        f"/api/v1/orders/{order['id']}/return-requests",
        headers=buyer["headers"],
        json={
            "order_item_id": item["id"],
            "qty": 1,
            "reason": "DEFECTIVE",
            "customer_note": "Left side stopped working",
        },
    )
    assert r.status_code == 201, r.text
    rr = r.json()
    assert rr["status"] == "REQUESTED"
    assert rr["return_number"].startswith("RET-")
    assert rr["qty"] == 1
    assert rr["refund_amount"] > 0

    # Customer lists own returns; other buyer sees empty
    r = await client.get("/api/v1/return-requests", headers=buyer["headers"])
    assert r.status_code == 200
    assert any(x["id"] == rr["id"] for x in r.json()["items"])

    r = await client.get("/api/v1/return-requests", headers=other["headers"])
    assert r.status_code == 200
    assert r.json()["total"] == 0

    # Staff approve -> schedule pickup -> mark received (auto-refund)
    r = await client.post(
        f"/api/v1/admin/return-requests/{rr['id']}/approve",
        headers=admin,
        json={"resolution_note": "Approved for pickup"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "APPROVED"

    r = await client.post(
        f"/api/v1/admin/return-requests/{rr['id']}/schedule-pickup",
        headers=admin,
        json={"pickup_tracking": "DLV-RET-7788"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "PICKUP_SCHEDULED"
    assert r.json()["pickup_tracking"] == "DLV-RET-7788"

    r = await client.post(
        f"/api/v1/admin/return-requests/{rr['id']}/mark-received",
        headers=admin,
        json={"issue_refund": True, "resolution_note": "Verified defective at warehouse"},
    )
    assert r.status_code == 200, r.text
    done = r.json()
    assert done["status"] == "REFUNDED"
    assert done["payment_id"] == payment["id"]

    # Partial return restocked exactly 1 unit
    products_after = await get_store_products(client)
    prod_after = next(p for p in products_after["items"] if p["id"] == prod["id"])
    assert prod_after["stock"]["on_hand"] == stock_before_return + 1

    # Dispatch outbox events through worker NotificationService
    from core.database import async_session_maker
    from modules.notifications.service import NotificationService

    async with async_session_maker() as s:
        pending = (
            await s.execute(
                text("SELECT id FROM outbox_events WHERE status = 'pending' ORDER BY created_at")
            )
        ).fetchall()
        svc = NotificationService(s)
        for (eid,) in pending:
            ok = await svc.process_outbox_event(str(eid))
            assert ok is True


async def test_return_window_expired_and_staff_bypass_and_cod_reject(client, admin):
    buyer = await register_and_login(client, 950003)
    order, prod = await _create_delivered_cod_order(client, admin, buyer, qty=1)
    item = order["items"][0]

    # Push delivered_at 8 days back -> customer request must fail 7-day check
    from core.database import async_session_maker

    async with async_session_maker() as s:
        await s.execute(
            text("UPDATE orders SET delivered_at = now() - interval '8 days' WHERE id = :oid"),
            {"oid": order["id"]},
        )
        await s.commit()

    r = await client.post(
        f"/api/v1/orders/{order['id']}/return-requests",
        headers=buyer["headers"],
        json={"order_item_id": item["id"], "qty": 1, "reason": "WRONG_ITEM"},
    )
    assert r.status_code == 400
    assert "7-day" in r.text

    # Admin-initiated return with bypass_window=True succeeds
    r = await client.post(
        "/api/v1/admin/return-requests",
        headers=admin,
        json={
            "order_id": order["id"],
            "order_item_id": item["id"],
            "qty": 1,
            "reason": "WRONG_ITEM",
            "customer_note": "Logged by support",
            "bypass_window": True,
        },
    )
    assert r.status_code == 201, r.text
    rr1 = r.json()

    # Reject frees up quantity so another return could be submitted if needed
    r = await client.post(
        f"/api/v1/admin/return-requests/{rr1['id']}/reject",
        headers=admin,
        json={"resolution_note": "Box seal intact per courier log"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "REJECTED"

    # Re-initiate COD return and take it all the way through RETURNED -> REFUNDED
    r = await client.post(
        "/api/v1/admin/return-requests",
        headers=admin,
        json={
            "order_id": order["id"],
            "order_item_id": item["id"],
            "qty": 1,
            "reason": "DAMAGED",
            "bypass_window": True,
        },
    )
    assert r.status_code == 201
    rr2 = r.json()

    assert (await client.post(f"/api/v1/admin/return-requests/{rr2['id']}/approve", headers=admin, json={})).status_code == 200
    assert (
        await client.post(
            f"/api/v1/admin/return-requests/{rr2['id']}/mark-received",
            headers=admin,
            json={"issue_refund": False},
        )
    ).json()["status"] == "RETURNED"

    r = await client.post(
        f"/api/v1/admin/return-requests/{rr2['id']}/refund",
        headers=admin,
        json={"resolution_note": "UPI payout completed"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "REFUNDED"


async def test_seller_returns_visibility_and_rls(client, admin):
    buyer = await register_and_login(client, 950004)
    order, prod = await _create_delivered_cod_order(client, admin, buyer, qty=1)
    item = order["items"][0]

    # Ensure a seller exists and owns this item for the test
    from core.database import async_session_maker
    from modules.auth.service import AuthService

    seller_id = str(uuid.uuid4())
    other_seller_id = str(uuid.uuid4())
    async with async_session_maker() as s:
        await s.execute(
            text(
                "INSERT INTO sellers (id, name, business_name, email, phone, status) "
                "VALUES (:id, 'Seller A', 'Alpha Tech', :email, :phone, 'ACTIVE')"
            ),
            {"id": seller_id, "email": f"sa_{seller_id[:6]}@example.com", "phone": f"91{seller_id[:8]}"},
        )
        await s.execute(
            text(
                "INSERT INTO sellers (id, name, business_name, email, phone, status) "
                "VALUES (:id, 'Seller B', 'Beta Tech', :email, :phone, 'ACTIVE')"
            ),
            {"id": other_seller_id, "email": f"sb_{other_seller_id[:6]}@example.com", "phone": f"92{other_seller_id[:8]}"},
        )
        await s.execute(
            text("UPDATE order_items SET seller_id = :sid WHERE id = :iid"),
            {"sid": seller_id, "iid": item["id"]},
        )
        await s.commit()

    r = await client.post(
        f"/api/v1/orders/{order['id']}/return-requests",
        headers=buyer["headers"],
        json={"order_item_id": item["id"], "qty": 1, "reason": "NOT_AS_DESCRIBED"},
    )
    assert r.status_code == 201, r.text
    rr = r.json()

    auth_svc = AuthService.__new__(AuthService)
    tok_a = auth_svc.create_access_token(seller_id, ["seller"], order["business_id"])
    tok_b = auth_svc.create_access_token(other_seller_id, ["seller"], order["business_id"])

    r_a = await client.get(
        "/api/v1/seller/return-requests",
        headers={"Authorization": f"Bearer {tok_a}"},
    )
    assert r_a.status_code == 200, r_a.text
    ids_a = [x["id"] for x in r_a.json()["items"]]
    assert rr["id"] in ids_a
    # Seller view must not expose customer email
    row_a = next(x for x in r_a.json()["items"] if x["id"] == rr["id"])
    assert row_a["customer_email"] is None

    r_b = await client.get(
        "/api/v1/seller/return-requests",
        headers={"Authorization": f"Bearer {tok_b}"},
    )
    assert r_b.status_code == 200, r_b.text
    assert rr["id"] not in [x["id"] for x in r_b.json()["items"]]


async def test_whatsapp_return_intent(client, admin):
    buyer = await register_and_login(client, 950005)
    order, prod = await _create_delivered_cod_order(client, admin, buyer, qty=1)

    from core.database import async_session_maker
    from modules.whatsapp.service import WhatsAppService

    async with async_session_maker() as s:
        svc = WhatsAppService(s)
        reply = await svc.handle_inbound_message(
            buyer["phone"], f"return {order['order_number']} damaged"
        )
    assert reply is not None
    assert "RET-" in reply
    assert "Return Request Submitted" in reply

    r = await client.get(
        f"/api/v1/orders/{order['id']}/return-requests",
        headers=buyer["headers"],
    )
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["reason"] == "DAMAGED"
