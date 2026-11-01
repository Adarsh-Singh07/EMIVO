import json
from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from httpx import Response
from pydantic import SecretStr

from core.config import settings
from modules.orders.delhivery import (
    create_delhivery_order,
    get_delhivery_base_url,
    resolve_pickup_location,
    track_delhivery_package,
)
from modules.orders.models import Order, OrderStatus
from modules.orders.schemas import OrderStatusUpdate


@pytest.fixture(autouse=True)
def mock_delhivery_settings():
    with patch.object(settings, "delhivery_api_key", SecretStr("mock-delhivery-test-key")), \
         patch.object(settings, "delhivery_origin_pincode", "841508"):
        yield


class DummyItem:
    def __init__(self, product_name: str, quantity: int):
        self.product_name = product_name
        self.quantity = quantity


class DummyOrder:
    def __init__(
        self,
        order_number: str = "ELK-261101-ABCDEF",
        payment_method: str = "ONLINE",
        total: int = 149900,  # ₹1,499.00
        items=None,
    ):
        self.id = "test-order-uuid-1234"
        self.order_number = order_number
        self.payment_method = payment_method
        self.total = total
        self.items = items or [DummyItem("Sony WH-1000XM5 Headphones", 1)]


def test_pickup_location_resolution_defaults():
    loc = resolve_pickup_location()
    assert loc["name"] == "ELEKTRIX"
    assert loc["pin_code"] == "841508"
    assert loc["city"] == "Gopalganj"
    assert loc["state"] == "Bihar"
    assert loc["phone"] == "8092024066"


def test_pickup_location_resolution_override():
    override = {
        "name": "Seller Warehouse Patna",
        "add": "Plot 42, Patliputra Industrial Area",
        "city": "Patna",
        "state": "Bihar",
        "pin_code": "800013",
        "phone": "9876543210",
    }
    loc = resolve_pickup_location(override)
    assert loc["name"] == "Seller Warehouse Patna"
    assert loc["pin_code"] == "800013"
    assert loc["city"] == "Patna"
    assert loc["phone"] == "9876543210"


def test_delhivery_environment_url():
    with patch.object(settings, "delhivery_environment", "sandbox"):
        assert get_delhivery_base_url() == "https://staging-express.delhivery.com"

    with patch.object(settings, "delhivery_environment", "prod"):
        assert get_delhivery_base_url() == "https://track.delhivery.com"


@pytest.mark.asyncio
async def test_create_delhivery_order_prepaid_success():
    order = DummyOrder(payment_method="ONLINE", total=199900)
    address = {
        "full_name": "Adarsh Sharma",
        "line1": "Flat 302, Green Valley Apartments",
        "line2": "MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "phone": "9876543210",
    }

    mock_resp = Response(
        200,
        json={
            "success": True,
            "packages": [
                {
                    "status": "Success",
                    "waybill": "1234567890123",
                    "remarks": [],
                }
            ],
        },
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        awb = await create_delhivery_order(order, address)
        assert awb == "1234567890123"

        # Verify call payload
        call_kwargs = mock_post.call_args[1]
        content_str = call_kwargs["content"]
        assert content_str.startswith("format=json&data=")
        data_json = json.loads(content_str.split("format=json&data=")[1])

        shipment = data_json["shipments"][0]
        assert shipment["payment_mode"] == "Pre-paid"
        assert shipment["cod_amount"] == 0.0
        assert shipment["total_amount"] == 1999.0
        assert shipment["pin"] == "560001"
        assert shipment["name"] == "Adarsh Sharma"
        assert shipment["seller_name"] == "ELEKTRIX"
        assert shipment["return_pin"] == "841508"


@pytest.mark.asyncio
async def test_create_delhivery_order_cod_success():
    order = DummyOrder(payment_method="COD", total=249900)
    address = {
        "full_name": "Rahul Verma",
        "line1": "House 12, Sector 15",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "pincode": "201301",
        "phone": "9811122233",
    }

    mock_resp = Response(
        200,
        json={
            "success": True,
            "packages": [
                {
                    "status": "Success",
                    "waybill": "9876543210987",
                }
            ],
        },
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        awb = await create_delhivery_order(order, address)
        assert awb == "9876543210987"

        call_kwargs = mock_post.call_args[1]
        data_json = json.loads(call_kwargs["content"].split("format=json&data=")[1])
        shipment = data_json["shipments"][0]
        assert shipment["payment_mode"] == "COD"
        assert shipment["cod_amount"] == 2499.0
        assert shipment["total_amount"] == 2499.0


@pytest.mark.asyncio
async def test_create_delhivery_order_seller_override():
    order = DummyOrder()
    address = {
        "full_name": "Deepak Patel",
        "line1": "Satellite Road",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380015",
        "phone": "9988776655",
    }
    pickup_override = {
        "name": "Apex Electronics Hub",
        "add": "GIDC Naroda, Phase 2",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pin_code": "382330",
        "phone": "9900011122",
    }

    mock_resp = Response(
        200,
        json={
            "success": True,
            "packages": [{"status": "Success", "waybill": "5555566666777"}],
        },
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        awb = await create_delhivery_order(
            order,
            address,
            pickup_location=pickup_override,
            seller_name="Apex Electronics",
        )
        assert awb == "5555566666777"

        data_json = json.loads(mock_post.call_args[1]["content"].split("format=json&data=")[1])
        shipment = data_json["shipments"][0]
        pickup = data_json["pickup_location"]

        assert shipment["seller_name"] == "Apex Electronics"
        assert shipment["return_pin"] == "382330"
        assert pickup["name"] == "Apex Electronics Hub"
        assert pickup["pin_code"] == "382330"


@pytest.mark.asyncio
async def test_create_delhivery_order_rejection_error_message():
    order = DummyOrder()
    address = {
        "full_name": "Customer",
        "line1": "Street 1",
        "city": "Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "phone": "9800000000",
    }

    mock_resp = Response(
        200,
        json={
            "success": False,
            "packages": [
                {
                    "status": "Fail",
                    "remarks": ["Pickup location 'ELEKTRIX' is not registered"],
                }
            ],
        },
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        with pytest.raises(ValueError) as excinfo:
            await create_delhivery_order(order, address)

        assert "Pickup location 'ELEKTRIX' is not registered" in str(excinfo.value)


@pytest.mark.asyncio
async def test_track_delhivery_package_live_parser():
    mock_resp = Response(
        200,
        json={
            "ShipmentData": [
                {
                    "Shipment": {
                        "Status": {
                            "Status": "In Transit",
                            "StatusType": "IT",
                            "StatusDateTime": "2026-11-01T15:30:00Z",
                            "Instructions": "Package arrived at Delhi Hub",
                        },
                        "Scans": [
                            {
                                "ScanDetail": {
                                    "ScanDateTime": "2026-11-01T15:30:00Z",
                                    "Scan": "Arrived at Hub",
                                    "ScannedLocation": "Delhi_Hub",
                                    "Instructions": "In Transit",
                                }
                            }
                        ],
                    }
                }
            ]
        },
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        tracking = await track_delhivery_package("1234567890123")
        assert tracking["waybill"] == "1234567890123"
        assert tracking["status"] == "In Transit"
        assert len(tracking["scans"]) == 1
        assert tracking["scans"][0]["location"] == "Delhi_Hub"
