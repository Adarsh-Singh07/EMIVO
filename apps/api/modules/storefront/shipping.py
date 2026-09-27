import logging
from datetime import datetime, timedelta
import json
import httpx
from core.config import settings
try:
    from core.redis import redis_manager
except Exception:
    redis_manager = None

logger = logging.getLogger(__name__)

WAREHOUSE_PINCODE = "841508"
WAREHOUSE_LOCATION = "Vijayipur, Gopalganj, Bihar"

# State Code to Transit Days (min_days, max_days) from warehouse 841508 (Bihar)
STATE_CODE_ETA = {
    "BR": (1, 2),
    "JH": (2, 3),
    "UP": (2, 4),
    "WB": (2, 4),
    "OR": (3, 5),
    "CG": (3, 5),
    "DL": (3, 5),
    "HR": (3, 5),
    "MH": (3, 5),
    "MP": (3, 5),
    "GJ": (3, 5),
    "RJ": (3, 5),
    "PB": (3, 5),
    "CH": (3, 5),
    "UT": (3, 5),
    "KA": (4, 6),
    "TS": (4, 6),
    "TN": (4, 6),
    "KL": (4, 6),
    "AP": (4, 6),
    "GA": (4, 6),
    "AS": (5, 7),
    "ML": (5, 7),
    "MZ": (5, 7),
    "NL": (5, 7),
    "TR": (5, 7),
    "AR": (5, 7),
    "MN": (5, 7),
    "SK": (5, 7),
    "JK": (5, 7),
    "HP": (5, 7),
}

# State name to state code normalization
STATE_NAME_TO_CODE = {
    "bihar": "BR",
    "jharkhand": "JH",
    "uttar pradesh": "UP",
    "west bengal": "WB",
    "odisha": "OR",
    "orissa": "OR",
    "chhattisgarh": "CG",
    "delhi": "DL",
    "haryana": "HR",
    "maharashtra": "MH",
    "madhya pradesh": "MP",
    "gujarat": "GJ",
    "rajasthan": "RJ",
    "punjab": "PB",
    "chandigarh": "CH",
    "uttarakhand": "UT",
    "karnataka": "KA",
    "telangana": "TS",
    "tamil nadu": "TN",
    "kerala": "KL",
    "andhra pradesh": "AP",
    "goa": "GA",
    "assam": "AS",
    "meghalaya": "ML",
    "mizoram": "MZ",
    "nagaland": "NL",
    "tripura": "TR",
    "arunachal pradesh": "AR",
    "manipur": "MN",
    "sikkim": "SK",
    "jammu and kashmir": "JK",
    "himachal pradesh": "HP",
}

STATE_CODE_TO_NAME = {
    code: name.title()
    for name, code in STATE_NAME_TO_CODE.items()
    if name != "orissa"  # prefer the modern "Odisha" spelling
}


def _format_delivery_dates(min_days: int, max_days: int) -> tuple[str, str, str]:
    now = datetime.now()
    min_date = now + timedelta(days=min_days)
    max_date = now + timedelta(days=max_days)
    
    # e.g., "Friday, 02 Oct"
    formatted_delivery_date = max_date.strftime("%A, %d %b")
    # e.g., "Wed, 30 Sep – Fri, 02 Oct"
    delivery_date_range = f"{min_date.strftime('%a, %d %b')} – {max_date.strftime('%a, %d %b')}"
    expected_delivery_date_iso = max_date.strftime("%Y-%m-%d")
    return formatted_delivery_date, delivery_date_range, expected_delivery_date_iso


async def _fetch_postal_pincode_details(pincode: str) -> dict:
    """Fetch official Indian Postal locality, district and state name."""
    url = f"https://api.postalpincode.in/pincode/{pincode}"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0 and data[0].get("Status") == "Success":
                    offices = data[0].get("PostOffice") or []
                    if offices:
                        first = offices[0]
                        city = first.get("District") or first.get("Name") or ""
                        state = first.get("State") or ""
                        place = first.get("Name") or city
                        return {
                            "city": city.title(),
                            "district": first.get("District", "").title(),
                            "state": state.title(),
                            "place": place.title(),
                            "state_code": STATE_NAME_TO_CODE.get(state.lower().strip(), "")
                        }
    except Exception as exc:
        logger.debug("Postal Pincode API lookup failed for %s: %s", pincode, exc)
    return {}


_MEM_CACHE = {}


async def _cache_get(key: str) -> dict | None:
    try:
        if redis_manager and getattr(redis_manager, "client", None):
            raw = await redis_manager.client.get(key)
            if raw:
                return json.loads(raw)
    except Exception:
        pass
    if key in _MEM_CACHE:
        return _MEM_CACHE[key]
    return None


async def _cache_set(key: str, val: dict, ttl: int = 86400) -> None:
    _MEM_CACHE[key] = val
    try:
        if redis_manager and getattr(redis_manager, "client", None):
            await redis_manager.client.set(key, json.dumps(val), ex=ttl)
    except Exception:
        pass


async def get_delhivery_estimate(destination_pincode: str, is_store_cod_enabled: bool = True) -> dict:
    """
    Computes delivery date, transit days, place name, and serviceability from warehouse 841508.
    Uses Delhivery API if key configured, enriches with Indian Postal API, and caches in Redis.
    """
    cache_key = f"pincode_est_v2:{destination_pincode}:{1 if is_store_cod_enabled else 0}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    delhivery_key = settings.delhivery_api_key.get_secret_value()
    origin_pin = settings.delhivery_origin_pincode or WAREHOUSE_PINCODE

    serviceable = True
    cod_available = is_store_cod_enabled
    prepaid_available = True
    city = ""
    district = ""
    state_name = ""
    state_code = ""

    # 1. Query Delhivery Serviceability API if configured
    if delhivery_key:
        base_url = (
            "https://staging-express.delhivery.com"
            if settings.delhivery_environment == "sandbox"
            else "https://track.delhivery.com"
        )
        url = f"{base_url}/c/api/pin-codes/json/?filter_codes={destination_pincode}"
        headers = {
            "Authorization": f"Token {delhivery_key}",
            "Content-Type": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    delivery_codes = data.get("delivery_codes") or []
                    if delivery_codes:
                        dc = delivery_codes[0].get("postal_code") or {}
                        city = dc.get("city", "").title()
                        district = dc.get("district", "").title()
                        state_code = dc.get("state_code", "").upper()
                        cod_available = is_store_cod_enabled and (dc.get("cod") == "Y")
                        prepaid_available = dc.get("pre_paid") == "Y"
                    else:
                        serviceable = False
        except Exception as exc:
            logger.warning("Delhivery API check failed for %s: %s", destination_pincode, exc)

    # 2. Enrich with India Post API if city / state info is incomplete
    if not city or not state_code or not state_name:
        postal_info = await _fetch_postal_pincode_details(destination_pincode)
        if postal_info:
            city = city or postal_info.get("city", "")
            district = district or postal_info.get("district", "")
            state_name = state_name or postal_info.get("state", "")
            state_code = state_code or postal_info.get("state_code", "")

    # Fill the state name from the code when the postal lookup was skipped
    if state_code and not state_name:
        state_name = STATE_CODE_TO_NAME.get(state_code, "")

    # Default state / days if unresolved
    if not state_code and destination_pincode.startswith("8"):
        state_code = "BR"
        state_name = state_name or "Bihar"
    elif not state_code and destination_pincode.startswith("5"):
        state_code = "KA"
        state_name = state_name or "Karnataka"
    elif not state_code and destination_pincode.startswith("1"):
        state_code = "DL"
        state_name = state_name or "Delhi"
    elif not state_code and destination_pincode.startswith("4"):
        state_code = "MH"
        state_name = state_name or "Maharashtra"

    min_days, max_days = STATE_CODE_ETA.get(state_code, (3, 6))
    formatted_date, date_range, delivery_date_iso = _format_delivery_dates(min_days, max_days)

    place_name = f"{city}, {state_name}" if (city and state_name) else (city or state_name or f"PIN {destination_pincode}")

    result = {
        "serviceable": serviceable,
        "pincode": destination_pincode,
        "city": city,
        "district": district,
        "state": state_name,
        "state_code": state_code,
        "place_name": place_name,
        "estimated_days": f"{min_days}-{max_days}",
        "estimated_days_min": min_days,
        "estimated_days_max": max_days,
        "expected_delivery_date": delivery_date_iso,
        "formatted_delivery_date": formatted_date,
        "delivery_date_range": date_range,
        "cod_available": cod_available,
        "prepaid_available": prepaid_available,
        "origin_pincode": origin_pin,
        "warehouse_location": WAREHOUSE_LOCATION,
        "message": f"Delivering to {place_name} — Delivery by {formatted_date}" if serviceable else f"Pincode {destination_pincode} is currently not serviceable"
    }

    await _cache_set(cache_key, result, ttl=86400)
    return result


async def reverse_geocode_location(lat: float, lon: float, is_store_cod_enabled: bool = True) -> dict:
    """
    Reverse geocodes latitude/longitude into an Indian Pincode, City, State,
    and returns the full delivery estimate from warehouse 841508.
    """
    cache_key = f"geo_pincode:{round(lat, 3)}:{round(lon, 3)}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    pincode = ""
    city = ""
    state = ""

    # Query OpenStreetMap Nominatim
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&addressdetails=1"
    headers = {"User-Agent": "ElektrixCommerce/2.0 (contact@elektrix.in)"}
    try:
        async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                address = data.get("address") or {}
                raw_pin = address.get("postcode", "")
                # Clean 6-digit Indian PIN
                if raw_pin and len(raw_pin.replace(" ", "")) == 6 and raw_pin.replace(" ", "").isdigit():
                    pincode = raw_pin.replace(" ", "")
                city = address.get("city") or address.get("town") or address.get("village") or address.get("county") or ""
                state = address.get("state") or ""
    except Exception as exc:
        logger.warning("Nominatim reverse geocode failed for (%s, %s): %s", lat, lon, exc)

    if pincode:
        est = await get_delhivery_estimate(pincode, is_store_cod_enabled=is_store_cod_enabled)
        result = {
            "success": True,
            "pincode": pincode,
            "city": city or est.get("city"),
            "state": state or est.get("state"),
            "estimate": est
        }
    else:
        result = {
            "success": False,
            "message": "Could not determine Indian pincode from your coordinates. Please enter your 6-digit pincode manually.",
            "estimate": None
        }

    await _cache_set(cache_key, result, ttl=86400)
    return result
