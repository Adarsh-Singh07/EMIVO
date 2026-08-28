import httpx
from core.config import settings

async def get_delhivery_estimate(destination_pincode: str) -> dict:
    if not settings.delhivery_api_key.get_secret_value() or not settings.delhivery_origin_pincode:
        return {"serviceable": True, "estimated_days": "3-5", "message": "Standard Delivery"}

    headers = {
        "Authorization": f"Token {settings.delhivery_api_key.get_secret_value()}",
        "Content-Type": "application/json"
    }
    
    # 1. Check Serviceability
    url = f"https://track.delhivery.com/c/api/pin-codes/json/?filter_codes={destination_pincode}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if "delivery_codes" in data and len(data["delivery_codes"]) > 0:
                dc = data["delivery_codes"][0]["postal_code"]
                return {
                    "serviceable": True,
                    "estimated_days": "2-4",
                    "cod_available": dc.get("cod") == "Y",
                    "prepaid_available": dc.get("pre_paid") == "Y",
                    "message": "Delivery available"
                }
    
    return {"serviceable": False, "estimated_days": None, "message": "Pincode not serviceable by our courier"}
