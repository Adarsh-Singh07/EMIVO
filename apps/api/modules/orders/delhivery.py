import httpx
import json
from core.config import settings
import logging

async def create_delhivery_order(order, address) -> str:
    """Creates an order in Delhivery and returns the AWB number."""
    if not settings.delhivery_api_key.get_secret_value() or not settings.delhivery_origin_pincode:
        raise ValueError("Delhivery configuration missing")

    payment_mode = "Pre-paid" if "ONLINE" in order.payment_method else "COD"
    
    data_dict = {
        "shipments": [{
            "name": address.name,
            "add": address.street,
            "pin": address.pincode,
            "city": address.city,
            "state": address.state,
            "country": "India",
            "phone": address.phone,
            "order": order.order_number,
            "payment_mode": payment_mode,
            "return_pin": settings.delhivery_origin_pincode,
            "return_city": "Gopalganj",
            "return_phone": "8092024066",
            "return_add": "DS1, 109, Near Indian Petrol Pump, Vijayipur",
            "return_state": "Bihar",
            "return_country": "India",
            "products_desc": "Electronics",
            "cod_amount": float(order.total_amount_paise) / 100 if payment_mode == "COD" else 0,
            "total_amount": float(order.total_amount_paise) / 100,
            "seller_add": "DS1, 109, Near Indian Petrol Pump, Vijayipur",
            "seller_name": "ELEKTRIX",
            "seller_inv": order.order_number,
            "quantity": "1",
            "waybill": ""
        }],
        "pickup_location": {
            "name": "ELEKTRIX",
            "add": "DS1, 109, Near Indian Petrol Pump, Vijayipur",
            "city": "Gopalganj",
            "pin_code": settings.delhivery_origin_pincode,
            "country": "India",
            "phone": "8092024066"
        }
    }
    
    payload = f"format=json&data={json.dumps(data_dict)}"
    
    headers = {
        "Authorization": f"Token {settings.delhivery_api_key.get_secret_value()}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    url = "https://track.delhivery.com/api/cmu/create.json"
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, content=payload, headers=headers)
        data = resp.json()
        
        logging.warning(f"Delhivery Create API Response: {data}")
        
        if data.get("success") == True or (data.get("packages") and len(data["packages"]) > 0):
            # Extract AWB
            packages = data.get("packages", [])
            for pkg in packages:
                if pkg.get("status") == "Success":
                    return pkg.get("waybill")
            
        raise ValueError(f"Delhivery API Error: {json.dumps(data)}")

