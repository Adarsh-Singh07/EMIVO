import httpx
from core.config import settings

async def get_delhivery_estimate(destination_pincode: str, is_store_cod_enabled: bool = True) -> dict:
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
                state = dc.get("state_code", "")
                
                # Dynamic ETA based on origin (Bihar) to destination state
                if state == "BR":
                    eta = "1-2"
                elif state in ["UP", "WB", "JH", "OR", "CG"]:
                    eta = "2-4"
                elif state in ["DL", "HR", "MH", "MP", "GJ", "RJ"]:
                    eta = "4-5"
                elif state in ["KA", "TS", "TN", "KL", "AP"]:
                    eta = "5-6"
                elif state in ["AS", "ML", "MZ", "NL", "TR", "AR", "MN", "SK"]:
                    eta = "6-8"
                else:
                    eta = "4-7"

                return {
                    "serviceable": True,
                    "estimated_days": eta,
                    "cod_available": is_store_cod_enabled and (dc.get("cod") == "Y"),
                    "prepaid_available": dc.get("pre_paid") == "Y",
                    "message": f"Delivery to {dc.get('city', 'your location')}"
                }
    
    return {"serviceable": False, "estimated_days": None, "message": "Pincode not serviceable by our courier"}
