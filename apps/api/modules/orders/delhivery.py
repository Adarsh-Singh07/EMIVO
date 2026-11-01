import json
import logging
from typing import Any, Dict, Optional
import httpx
from core.config import settings

logger = logging.getLogger(__name__)


def get_delhivery_base_url() -> str:
    env = (settings.delhivery_environment or "").strip().lower()
    if env in ("sandbox", "staging", "test"):
        return "https://staging-express.delhivery.com"
    return "https://track.delhivery.com"


def _get_field(obj: Any, *keys: str, default: str = "") -> str:
    if isinstance(obj, dict):
        for k in keys:
            val = obj.get(k)
            if val is not None and str(val).strip():
                return str(val).strip()
    else:
        for k in keys:
            if hasattr(obj, k):
                val = getattr(obj, k)
                if val is not None and str(val).strip():
                    return str(val).strip()
    return default


def resolve_pickup_location(override: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    default = {
        "name": settings.delhivery_pickup_location_name or "ELEKTRIX",
        "add": settings.delhivery_pickup_add or "DS1, 109, Near Indian Petrol Pump, Vijayipur",
        "city": settings.delhivery_pickup_city or "Gopalganj",
        "state": settings.delhivery_pickup_state or "Bihar",
        "pin_code": settings.delhivery_origin_pincode or "841508",
        "country": "India",
        "phone": settings.delhivery_pickup_phone or "8092024066",
    }
    if not override:
        return default
    
    cleaned_override = {
        k: str(v).strip()
        for k, v in override.items()
        if v is not None and str(v).strip()
    }
    return {**default, **cleaned_override}


async def create_delhivery_order(
    order: Any,
    address: Any,
    pickup_location: Optional[Dict[str, Any]] = None,
    seller_name: Optional[str] = None,
) -> str:
    """Creates an order in Delhivery Express (manifestation) and returns the AWB/waybill number.
    
    Supports both Sandbox and Production Delhivery environments, custom pickup locations
    (origin warehouses), and multi-seller drop-shipping configuration.
    """
    api_key = settings.delhivery_api_key.get_secret_value()
    if not api_key:
        raise ValueError("Delhivery API key is missing in server configuration")

    # Destination address fields
    cust_name = _get_field(address, "full_name", "name", default="Valued Customer")
    line1 = _get_field(address, "line1", "street", default="")
    line2 = _get_field(address, "line2", default="")
    cust_add = f"{line1}, {line2}".strip(", ") if line2 else line1
    if not cust_add:
        cust_add = "Address details provided on delivery"

    cust_pin = _get_field(address, "pincode", "postal_code", "pin", default="")
    if not cust_pin:
        raise ValueError("Customer shipping pincode is missing")

    cust_city = _get_field(address, "city", default="")
    cust_state = _get_field(address, "state", default="")
    cust_phone = _get_field(address, "phone", default="")
    cust_country = _get_field(address, "country", default="India")

    # Pickup warehouse & Seller resolution
    pickup = resolve_pickup_location(pickup_location)
    resolved_seller_name = seller_name or pickup.get("name") or "ELEKTRIX"

    # Payment mode & amounts
    pay_method = (getattr(order, "payment_method", None) or "").upper()
    payment_mode = "Pre-paid" if pay_method == "ONLINE" else "COD"

    total_paise = getattr(order, "total", 0)
    total_rupees = round(float(total_paise) / 100.0, 2)
    cod_amount = total_rupees if payment_mode == "COD" else 0.0

    # Products summary & quantity
    order_items = getattr(order, "items", None) or []
    if order_items:
        desc_parts = [getattr(it, "product_name", "") for it in order_items if getattr(it, "product_name", "")]
        products_desc = ", ".join(desc_parts)[:200] if desc_parts else "Electronics"
        quantity_count = sum(getattr(it, "quantity", 1) for it in order_items) or 1
    else:
        products_desc = "Electronics"
        quantity_count = 1

    order_num = getattr(order, "order_number", None) or f"ELK-{str(getattr(order, 'id', ''))[:8]}"

    shipment_dict = {
        "name": cust_name,
        "add": cust_add,
        "pin": cust_pin,
        "city": cust_city,
        "state": cust_state,
        "country": cust_country,
        "phone": cust_phone,
        "order": order_num,
        "payment_mode": payment_mode,
        "return_pin": pickup["pin_code"],
        "return_city": pickup["city"],
        "return_phone": pickup["phone"],
        "return_add": pickup["add"],
        "return_state": pickup["state"],
        "return_country": pickup.get("country", "India"),
        "products_desc": products_desc,
        "cod_amount": cod_amount,
        "total_amount": total_rupees,
        "seller_add": pickup["add"],
        "seller_name": resolved_seller_name,
        "seller_inv": order_num,
        "quantity": str(quantity_count),
        "waybill": "",
    }

    pickup_dict = {
        "name": pickup["name"],
        "add": pickup["add"],
        "city": pickup["city"],
        "pin_code": pickup["pin_code"],
        "country": pickup.get("country", "India"),
        "phone": pickup["phone"],
    }

    data_dict = {
        "shipments": [shipment_dict],
        "pickup_location": pickup_dict,
    }

    payload = f"format=json&data={json.dumps(data_dict)}"
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    base_url = get_delhivery_base_url()
    manifest_url = f"{base_url}/api/cmu/create.json"

    logger.info(
        "Manifesting Delhivery order %s via %s (pickup: %s, dest: %s, mode: %s)",
        order_num,
        manifest_url,
        pickup["name"],
        cust_pin,
        payment_mode,
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(manifest_url, content=payload, headers=headers)
        
        try:
            data = resp.json()
        except Exception:
            raise ValueError(
                f"Delhivery server error ({resp.status_code}): {resp.text[:300]}"
            )

        logger.info("Delhivery response for %s: %s", order_num, data)

        # Success scenarios
        packages = data.get("packages", [])
        if packages:
            first_pkg = packages[0]
            pkg_status = (first_pkg.get("status") or "").strip().lower()
            if pkg_status == "success" and first_pkg.get("waybill"):
                return str(first_pkg["waybill"])

            # Failure with remarks
            remarks = first_pkg.get("remarks") or []
            if isinstance(remarks, list) and remarks:
                err_detail = "; ".join(str(r) for r in remarks)
                raise ValueError(f"Delhivery manifest rejected: {err_detail}")
            if first_pkg.get("error"):
                raise ValueError(f"Delhivery error: {first_pkg.get('error')}")

        # Top-level success check
        if data.get("success") is True and data.get("upload_wbn"):
            return str(data["upload_wbn"])

        # Check for general error / rmk
        error_msg = data.get("error") or data.get("rmk") or data.get("message")
        if error_msg:
            raise ValueError(f"Delhivery API Error: {error_msg}")

        raise ValueError(f"Delhivery manifestation failed: {json.dumps(data)}")


async def track_delhivery_package(waybill: str) -> Dict[str, Any]:
    """Queries Delhivery package tracking API for real-time tracking scans."""
    api_key = settings.delhivery_api_key.get_secret_value()
    if not api_key:
        return {"waybill": waybill, "error": "Delhivery API key not configured"}

    base_url = get_delhivery_base_url()
    url = f"{base_url}/api/v1/packages/json/?waybill={waybill}&token={api_key}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            data = resp.json()
            
            # Format: {"ShipmentData": [{"Shipment": {...}}]}
            shipments = data.get("ShipmentData", [])
            if shipments and isinstance(shipments, list):
                shipment = shipments[0].get("Shipment", {})
                status_obj = shipment.get("Status", {})
                scans = shipment.get("Scans", [])
                return {
                    "waybill": waybill,
                    "status": status_obj.get("Status", "In Transit"),
                    "status_type": status_obj.get("StatusType"),
                    "status_date": status_obj.get("StatusDateTime"),
                    "instructions": status_obj.get("Instructions"),
                    "scans": [
                        {
                            "date": scan.get("ScanDetail", {}).get("ScanDateTime"),
                            "status": scan.get("ScanDetail", {}).get("Scan"),
                            "location": scan.get("ScanDetail", {}).get("ScannedLocation"),
                            "instructions": scan.get("ScanDetail", {}).get("Instructions"),
                        }
                        for scan in scans
                        if isinstance(scan, dict) and "ScanDetail" in scan
                    ],
                }
            
            return {
                "waybill": waybill,
                "status": "Information Received",
                "scans": [],
                "raw_response": data,
            }
    except Exception as e:
        logger.warning("Error fetching Delhivery tracking for %s: %s", waybill, e)
        return {"waybill": waybill, "error": str(e)}
