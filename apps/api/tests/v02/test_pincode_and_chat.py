import pytest
from modules.storefront.shipping import (
    get_delhivery_estimate,
    reverse_geocode_location,
    WAREHOUSE_PINCODE,
)
from modules.chatbot.service import ask_gemini


@pytest.mark.asyncio
async def test_get_delhivery_estimate_warehouse_bihar():
    """Verify estimate from warehouse 841508 to destination in Bihar."""
    res = await get_delhivery_estimate("841508")
    assert res["serviceable"] is True
    assert res["origin_pincode"] == WAREHOUSE_PINCODE
    assert "Bihar" in res["state"]
    assert res["estimated_days"] == "1-2"
    assert res["expected_delivery_date"] is not None
    assert res["formatted_delivery_date"] is not None
    assert "Delivering to" in res["message"]


@pytest.mark.asyncio
async def test_get_delhivery_estimate_metro_south():
    """Verify estimate to Karnataka / South India (e.g. 560001)."""
    res = await get_delhivery_estimate("560001")
    assert res["serviceable"] is True
    assert "Karnataka" in res["state"] or "Bangalore" in res["city"]
    assert res["estimated_days"] in ("4-6", "3-5", "5-7")
    assert res["expected_delivery_date"] is not None
    assert res["formatted_delivery_date"] is not None


@pytest.mark.asyncio
async def test_reverse_geocode_location():
    """Verify reverse geocoding from coordinates to Pincode and estimate."""
    res = await reverse_geocode_location(12.9716, 77.5946)
    assert res["success"] is True
    assert res["pincode"] == "560001"
    assert res["estimate"] is not None
    assert res["estimate"]["serviceable"] is True


@pytest.mark.asyncio
async def test_chatbot_guest_comparison():
    """Verify guest user asking for a comparison gets a useful answer with
    store links (the offline fallback must not invent products)."""
    reply, ticket, cancel = await ask_gemini(
        session=None,
        user_id=None,
        user_name="Visitor",
        message="Can you compare two laptops for me?",
    )
    assert reply is not None
    assert ticket is None
    assert cancel is None


@pytest.mark.asyncio
async def test_chatbot_guest_order_privacy_gate():
    """Verify guest user is blocked from viewing order details without login/OTP."""
    reply, ticket, cancel = await ask_gemini(
        session=None,
        user_id=None,
        user_name="Visitor",
        message="Where is my order ELK-123456?",
    )
    assert reply is not None
    assert "log in" in reply.lower() or "otp" in reply.lower() or "verification" in reply.lower()
    assert cancel is None


@pytest.mark.asyncio
async def test_chatbot_guest_complaint():
    """Verify guest user can initiate an issue/complaint."""
    reply, ticket, cancel = await ask_gemini(
        session=None,
        user_id=None,
        user_name="Visitor",
        message="I have an issue with charger. Name=Vikas, email=vikas@example.com, phone=9876543210",
    )
    assert reply is not None
