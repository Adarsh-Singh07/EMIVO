import pytest
from datetime import datetime, timezone
from uuid import uuid4

from core.exceptions import DomainException
from modules.admin.service import AdminService
from modules.orders.invoice import (
    build_tax_invoice_data,
    render_invoice_html,
    num_to_words_inr,
    generate_invoice_number,
)
from modules.orders.schemas import OrderStatus, OrderStatusUpdate
from modules.orders.service import OrderService
from modules.products.service import ProductService


def test_num_to_words_inr():
    assert num_to_words_inr(0) == "INR Zero Rupees Only"
    assert num_to_words_inr(100) == "INR One Hundred Rupees Only"
    assert num_to_words_inr(1250) == "INR One Thousand Two Hundred Fifty Rupees Only"
    assert num_to_words_inr(54999) == "INR Fifty Four Thousand Nine Hundred Ninety Nine Rupees Only"
    assert "Rupees" in num_to_words_inr(100000)


def test_generate_invoice_number():
    inv = generate_invoice_number("ELX-20261123-0001", 1)
    assert inv.startswith("AE/")
    assert inv.endswith("/0001")


def test_generate_tax_invoice_html():
    order_data = {
        "id": "ord-12345678",
        "order_number": "ELX-20261123-0001",
        "created_at": datetime.now(timezone.utc),
        "status": "DELIVERED",
        "total": 5499900,
        "subtotal": 5499900,
        "tax_total": 838968,
        "shipping_total": 0,
        "discount_total": 0,
        "payment_method": "ONLINE",
        "payment_status": "SUCCESS",
        "delivery_otp": "481920",
        "fulfillment_type": "STORE_PICKUP",
        "invoice_number": "AE/26-27/0042",
        "invoice_generated_at": datetime.now(timezone.utc),
        "customer_name": "Aman Kumar",
        "customer_email": "aman@example.com",
        "customer_phone": "9876543210",
        "shipping_address": {
            "name": "Aman Kumar",
            "line1": "Ward No. 4, Main Road",
            "city": "Gopalganj",
            "state": "Bihar",
            "pincode": "841508",
        },
        "items": [
            {
                "id": "item-1",
                "product_name": "Vivo Y29 5G",
                "variant_name": "8GB RAM / 128GB Storage",
                "hsn_code": "8517",
                "serial_numbers": ["864523051234567"],
                "quantity": 1,
                "unit_price": 5499900,
                "subtotal": 5499900,
            }
        ],
    }
    seller_data = {
        "business_name": "Apana Enterprises",
        "legal_name": "M/S APANA ENTERPRISES",
        "gstin": "10COMPG4070G1ZB",
        "address": "109, DS1, Near Indian Petrol Pump, Vijaipur, Gopalganj",
        "city": "Gopalganj",
        "state": "Bihar",
        "pincode": "841508",
        "phone": "8092024066",
        "email": "info@apanaenterprises.in",
    }
    inv_data = build_tax_invoice_data(order_data, seller_data)
    html = render_invoice_html(inv_data)
    assert "Tax Invoice" in html
    assert "Apana Enterprises" in html
    assert "10COMPG4070G1ZB" in html
    assert "Vivo Y29 5G" in html
    assert "864523051234567" in html
    assert "AE/26-27/0042" in html
    assert "CGST" in html
    assert "SGST" in html


@pytest.mark.asyncio
async def test_master_admin_cannot_be_revoked_or_deleted():
    from core.database import async_session_maker
    async with async_session_maker() as session:
        admin_svc = AdminService(session)
        with pytest.raises(DomainException) as exc_info:
            await admin_svc.revoke_admin("adarsh2001gop@gmail.com")
        assert exc_info.value.status_code == 403
        assert "Master Admin" in exc_info.value.message

        with pytest.raises(DomainException) as exc_info2:
            await admin_svc.delete_user("adarsh2001gop@gmail.com")
        assert exc_info2.value.status_code == 403
        assert "Master Admin" in exc_info2.value.message
