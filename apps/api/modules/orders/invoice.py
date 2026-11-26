import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Brand assets, inlined as base64 so the invoice HTML is fully self-contained:
# it renders identically whether opened as a blob URL, printed, or saved as a
# PDF, with no extra network fetches. Source: storefront/public/branding.
# ---------------------------------------------------------------------------
_ELEKTRIX_ICON_B64 = "iVBORw0KGgoAAAANSUhEUgAAAJoAAACWBAMAAADUE4xfAAAAMFBMVEUEBAcFBQn7+/xMaXH08/QDAwbPz88DAwUUFRYDAwY4OTpeXmCdnZ5LTEwCAgR/f4CkM6n1AAAAEHRSTlP+/f4A/s3+efmr/v7+/jT+e75eegAAAAlwSFlzAAAOwwAADsMBx2+oZAAADXhJREFUaIGVWr2LXccVnymMVh8bzTSKA0HF46JGCioeYnGzxeOSQiFExoTETcAiGBWByJjgpAlyI9kEhIwIiTsFTAiujFoRkFWGFEtIkUZFWIKVxij+C8L5/X7nzNz73ttdTbH73rtzz5zvz0nL6fr6g09Pvj74evZ2mnz76vclvcrKb/92K7T9X6WU6yutnH9yuBna/iep1rLxpVT9SSq12onJfsIP9w43Qdt/M9dagNyxCJZa4tjy8eE6tP1PAKwjtfD8HnTGbwUPay3Z/tb0ncM1aL/GW0kUkBgwekpy/JJ4Hv7dm0P7L97XY33qoSWiwVVrMp7oS67l4RTa3p2AUez9kkFFBizQn3MtfkQtqTqwZOe8djiBdlusyiXlAi4bADDKoXWamEt2NPX9fg/tDacHrHANyHaucMAD0Li+Sq07hx20B8HkXMAhI6qkQqmAGjtlDVp2ysu3GzRHDXuNCCO0ZINniAKyHWQM2IRcSjkfBjRwTeIr2cABw1RMXoFOtpcatNoJIiVyzqDtCytjfwgtp5pNKMC1W74lN4UBjyFWg/Yi2yFSfcPKANkeKQDQy0C0o63G2eTcQ0F7oFNgAeCM9Ni0ynSEephC39ah5VxPEdpedpxtQ0nV2A9g2TWrJBlnsKpQGV3IOUNJkhEah8BCwSqwuAqayTdV+9ixKoOrDq4mIzWZRP1EN3wDU0sJAdpjgxygsHpKU07lokHbvwOt1wbYUjFCfCueQY9nq1IR+W5O+bRB2zPT9jcBLRvb7Q/9hj2lwUFC0Jp2jjMu5Z3DZQLbpLokEWwHpyQB7W66l/1wxx/HlPeXaXkbpIUFQiOSGVGvtng/U1181WIqY0/wszmStLxhypnBBbcEM0kXDF4IKeXOnKqZbZxUaz61TPsf8seJdyjFzHXOefmQ3GB0q9Z8epn2MhEOGRK0O4/2nm2iaMsUjB6b/qY3CAd+zX+Hq6Znz+Y3/BGU3z8EHc6FUt5P17LMT+STsdATSENYzyw+iTO94dfyML2QVTZOk6eEakGY4BvvU/DAzmiGlMtb6XZzfyYzkmLmCS2X2Cha+YJkiuIi7txILffTbYVckhOKbpwTw8iCoJaetDZuwIJx2sX0gMcLGkKghS6EPjMHU7ZAX76uut+lGQXjAK1HVphRgUyt4STtZ4VA+LJq1qvQFNZW8ql0o3MsUIpwqvYclm4G0JIGI9OgtQxFPqBWgyZPC2EBlqJ0lWv3sOcCqV2E02dsn+BmZPXZlkFDlkaG0YkYxpUsiM0tiAGanE0HzXNJQINzon93jaye3AmawnjgNk8nEZaNcPuHeB22nulEuzekEJuhIR7pWHzDX7KOOVmZ5pzMV8A3d0j9w8kX02m5J4SugqxgmhwbW4GbQZMoty6XqGkf2DffQIQMGig5bkm6DP5l7XAcRUqpj8csmZMbdRXKznJoBaBFxDpq4RXG1mKv1Fpf/xzrT4GcQ7OvO8+PWH9BOkbnl3l2uTDaWr1EiLEDoSEmj5Ly2WG12LrGX0I5oOlZVD4bF4vFcIVRzRQQ0Ijb0dAWi1tw8J1ynh/GxWJY3XLjkxRkJUdDGy/doShdO8tjoHYJlYbpoKSg58fgtrrlepGwfde2D6vrCrz2wKDBCWdAG45E7kN6ogQHXz6zzcN4YK/KpwE3MeIY3BarL92Nllryzk3bvbpssNyludXnE0Abr8Kd06WWu9i9esmagGHToEknj5PpYrH6gtpR7O8z2zxcoWsUcoAmAzl7FNfAIyNLZfA5yuAdxgQywKWAaH72++9uXT8f7eXhwGVavlmFerTAHdDMRXy0ff3OoC1W1xXQMrmC705nDkqR/GxphVDRHRemUoXqMTxqKWSP29wBrjmwc2Dq6h1uPbMy4ONlRVLgUidS6PyelGqyJEMa1V3CfuklGetBxFMPvj0wuITeV5a7tPGX+HrTTHS8QkYgaQkNafUfMrPI3xooO5e6P1zNjeyncNotUQRunXON3y1bnQYvMd40uHzj3oPNlqhnTArOqObpzVfNYkXJu+O4Wgyrp9XVw3yKdFcJXYdbD80y5ymwlODPhiu1ln+Ca8MjRQMkxzNKSVYIdAKNEf/8AFOqZ2DO4w+ZxjHTbnxTP0G4eeLKDITKJ2f7bDT1pXoMqy/YoGLGSa1wW0D8tejVtRgALVwQRLm6nnIO4XplFJwXNPXdNiwGFeaK+eZ4UOq5AdIw1+m02JG5+V6EsI122vLJlMrdy7kWM4qVSUOayLoC4Vq+Fz7vzN/X19+6qjql3ZepnqdjY8hxYapT6PEUXmaDh5Rdt6S+PIYMzJlYJgazBBfMUzi05smHcTR1WuAfvYRsTTosxxa1FFsAZtjMorV7Q1wY4LvFGwj+Mxj/4kBUZqtHVd7WGbRxHlYQCehjGCdh+8P4g95wghPHQDNKo48DDC64iWZvukrwEylkTwW2UQqXkqEeCwjB+8Jy5Q5NbbETQLO0iNBWiHz094pX1jKVR0JSNpOCZIqsGS0+pEUCdwUawcY1aA3cVKZs0zeWHmDH2YXOG+jRZd/hz5plpbzz5MmTvz5/0q/n/6LdsPFM9+vHqBtGr0TkIma1Wn1uqOgqgUEMDcoiDlg5hzq6LTRMNy2JocU9kXpdeHmYUd7L1i6LQOsKaIDQh2iJ1OLearzaZ6hqmVPA4Xt7lZ6FUmXvinvD6un5wSI9smevR5ioQ0PoVjw/dL89BWbUMO5dKemZKQ89XNfEieqj7+bRJqeBHucwvVvdSuXCEEoykRz51qptNM8iEW7gTEvErkclRdjvmkgdbioSPVkoVpPOiM1Mi5CxlRb22fHpoowoPbpCLeXP8OAjsstds4lhRKnQj0kcmge5rWvnJpwuM9/yGFmElCRa1PlUekCqjoMGxwbOW7GAEktKAmjotAduW+PpLBmUlRd8HS9NpdqgoccTiubiiDJNCf2X7jMuDJPqpkGrJ8DtdSXR6Ccnjw+obhS7vHZW26jm3e3lwrseDnwYV5qSoFJGAkxoJuhSNnrLiVu/9KiJaxciHr/H2SFbh0GpCRae3FKWLYu1h3vcxzBWTwlp4wHt+BpwGA5aHpxCSVqv6pWgKYuQlDOVBAnJBJrrxdmBGcg2Ql96GC/QgO9SaZ4qXczuLU+E22hBz7uI2bSGnsR+piSUOaBvuxZPZ8Cgub17KF11o36suivga2Rcc/bjkB9xEhKONOUzKzN9C+Dim/ct0WY8qnYefvHIg41DS+UffHQQRVqfh+x8fsRCZwAjjmaIZ5nN/m8CLeaJG6NzFzHUbawOrdMN+gj2VNd7fRsX87R5OadnygZZjiivnewgPhYB1dzl/LPGPgUShCnzaU7pVteLQXRUwuijVDCQkhA0Qd/QocXOxou+4crMoxRLnQnNM7cGjVFCmKg1zN47x2ZxwQDVAbZkCw4+xGg0y1t6tuDpjb3CTcy6etxYvhoKXaOYBJHSIK3pg3Rgco0C9XnLMHK1imiOm1jJHNbERl/stIlzLPiM1MxBo7KZXroWT53fzMHYTNa+YnMUE6UY4bPQzFa35vkhtICmebiPa0Mx1IBw2jR+zsxhWe0FZfWUzYyEK2veuDaghqKzEjmnirSM0Y/pImOw9/y/lW5L9TA/46ivFRQ8OzikUXRCnhCBT6ilXC+mf/dqyqkOp1pMC6M1bu+hREY/x4RZ1/T+fnohq/P5GaM5A0roi816pbAmpewjOJbwUrFS3krXhCmbOBzeYcxCDYUQObtlqOIUvyh7DhUBlIeYeLr0ef2AszlRLlvjyI7XCSoOJjv7az028dwzG/KZJDUYVZDPTjBmy20QQDlXe8yefhuS7Rymfeswq1Pic2UfRvqMkkWGOh3FVNf7l5M52Oll6u6tqIdC52BWZrqOdhesqalKUhlHljjbbIqNqyZ+JcLaPxyhYg7OOpKmRCuHNRUgS9FJorAlm7BDqIocmociGZP7kcGSgao9E8E1f0QFeYibCX1UU+2g0gmeEazBN13MSGHCihFyWHYzYV9ZErGmDDQ7iysLkrAMKjnbfaJJP3I6bnTI0Hy2hQtOyADU9obOqptUiJSPIVFS2Uu40WGM8/s5Uf+51ZuuaVSEOiw8ezL+dBw3S4ibMILGwi0yK9zF0Mjf/gMaLi1EctrKV92EMY2DeXZd49hN0zFu+nyb1uU3GNgkQGKpOz/XpBp9tIMrVANWwYUFSstMUh+wcK2Gt5sQWNyRh9m1C0maYuvSBFaEBN/9WnfzSrzoArs5DG9IMXqxRayfkvc15GrLzwLanpHa3/uJwKxLU+HUqDCZzrD5It5G6m6seaM3dui2DMH58L+t2rwknPj8Nt20/0z17zt23WWmqg5a7J7cplu+BylOPGlr1a1dNMv9qYi+99duIYLL3Ua/3yPvEYlpmud6a7cQl/9RbtbvFKHS5pi4JNpOByzNbkgul+81OP6poysGavAEdbqoHdObpTda1z7+Sw80dMbXBiR7snxvw63XvRuIXCy2uwYXbyXy6gheLh0F9kq7ptrfyN1706/Toe5aH+NrSpC8/8kzuiu009vCfzy6cOjGSPHL1tvCy+X+b356ZEGztvLH228yG7yvPv3xidfbf5jfsv4/znu+sBsUEHgAAAAASUVORK5CYII="
_ELEKTRIX_WORDMARK_B64 = "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"

# Indian GST state codes — used for "State Code" / "Place of Supply" rows so
# they are derived from the address instead of hardcoded to Bihar (10).
_STATE_CODES = {
    "jammu": "01", "kashmir": "01", "ladakh": "38",
    "himachal": "02", "punjab": "03", "chandigarh": "04",
    "uttarakhand": "05", "uttaranchal": "05", "haryana": "06",
    "delhi": "07", "new delhi": "07", "rajasthan": "08",
    "uttar pradesh": "09", "bihar": "10", "sikkim": "11",
    "arunachal": "12", "nagaland": "13", "manipur": "14",
    "mizoram": "15", "tripura": "16", "meghalaya": "17",
    "assam": "18", "west bengal": "19", "jharkhand": "20",
    "odisha": "21", "orissa": "21", "chhattisgarh": "22",
    "madhya pradesh": "23", "gujarat": "24",
    "dadra": "26", "daman": "25", "maharashtra": "27",
    "andhra pradesh": "37", "karnataka": "29", "goa": "30",
    "lakshadweep": "31", "kerala": "32", "tamil nadu": "33",
    "puducherry": "34", "pondicherry": "34", "andaman": "35",
    "telangana": "36",
}


def _state_code(state: str) -> str:
    name = (state or "").strip().lower()
    for key, code in _STATE_CODES.items():
        if key in name:
            return code
    return "97"  # "Other Territory" — honest fallback, never a wrong code


def num_to_words_inr(number: float) -> str:
    """Convert number to Indian Currency Words format (Lakhs, Crores)."""
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _two_digits(n: int) -> str:
        if n < 20:
            return units[n]
        return (tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")).strip()

    def _three_digits(n: int) -> str:
        h = n // 100
        rem = n % 100
        res = ""
        if h > 0:
            res += units[h] + " Hundred "
        if rem > 0:
            res += _two_digits(rem)
        return res.strip()

    rupees = int(math.floor(number))
    paise = int(round((number - rupees) * 100))

    if rupees == 0:
        words = "Zero"
    else:
        parts = []
        crore = rupees // 10000000
        rupees %= 10000000
        if crore > 0:
            parts.append(f"{_two_digits(crore)} Crore")

        lakh = rupees // 100000
        rupees %= 100000
        if lakh > 0:
            parts.append(f"{_two_digits(lakh)} Lakh")

        thousand = rupees // 1000
        rupees %= 1000
        if thousand > 0:
            parts.append(f"{_two_digits(thousand)} Thousand")

        if rupees > 0:
            parts.append(_three_digits(rupees))

        words = " ".join(parts).strip()

    res = f"INR {words} Rupees"
    if paise > 0:
        res += f" and {_two_digits(paise)} Paise"
    return res + " Only"


def generate_invoice_number(order_num: str, seq: int = 1) -> str:
    """Generate professional tax invoice number (e.g. AE/26-27/0065)."""
    now = datetime.now(timezone.utc)
    # Financial year in India: starts April 1st
    curr_year = now.year % 100
    next_year = curr_year + 1 if now.month >= 4 else curr_year
    prev_year = curr_year if now.month >= 4 else curr_year - 1
    fy = f"{prev_year:02d}-{next_year:02d}"

    clean_num = "".join(filter(str.isdigit, str(order_num)))[-4:] or f"{seq:04d}"
    return f"AE/{fy}/{clean_num}"


def build_tax_invoice_data(
    order: Any,
    seller: Optional[Dict[str, Any]] = None,
    payment: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Calculate and structure invoice data adhering to Indian GST Rules.

    ``payment`` (optional) carries the SUCCESS payment row — provider and
    provider_payment_id — so the invoice can show a real payment reference.
    """
    def _val(obj: Any, attr: str, default: Any = None) -> Any:
        if isinstance(obj, dict):
            return obj.get(attr, default)
        return getattr(obj, attr, default)

    # Seller defaults to Apana Enterprises (official Elektrix retailer)
    seller_name = seller.get("business_name") if seller else None
    if not seller_name or seller_name == "Elektrix":
        seller_name = "M/S APANA ENTERPRISES"

    seller_gstin = (seller.get("gstin") if seller else None) or "10COMPG4070G1ZB"
    seller_address = (seller.get("address") if seller else None) or "109, DS1, Near Indian Petrol Pump, Vijaipur, Gopalganj"
    seller_address2 = (seller.get("address_line2") if seller else None) or ""
    seller_city = (seller.get("city") if seller else None) or "Gopalganj"
    seller_state = (seller.get("state") if seller else None) or "Bihar"
    seller_state_code = _state_code(seller_state)
    seller_pincode = (seller.get("pincode") if seller else None) or "841508"
    seller_email = (seller.get("email") if seller else None) or "welcome.apana@gmail.com"
    seller_phone = (seller.get("phone") if seller else None) or "8539838942"
    # PAN is embedded in the GSTIN: chars 3..12 of the 15-char code
    seller_pan = seller_gstin[2:12] if len(seller_gstin) == 15 else ""

    shipping_addr = _val(order, "shipping_address") or {}
    buyer_name = _val(shipping_addr, "full_name") or _val(shipping_addr, "name") or "Valued Customer"
    buyer_phone = _val(shipping_addr, "phone") or ""
    buyer_line1 = _val(shipping_addr, "line1") or _val(shipping_addr, "street") or ""
    buyer_line2 = _val(shipping_addr, "line2") or ""
    buyer_city = _val(shipping_addr, "city") or ""
    buyer_state = _val(shipping_addr, "state") or "Bihar"
    buyer_state_code = _state_code(buyer_state)
    buyer_pincode = _val(shipping_addr, "pincode") or ""

    is_intra_state = seller_state_code == buyer_state_code

    items_data = []
    total_taxable_paise = 0
    total_cgst_paise = 0
    total_sgst_paise = 0
    total_igst_paise = 0
    subtotal_paise = 0
    total_qty = 0
    tax_groups: Dict[str, Dict[str, Any]] = {}

    order_items = _val(order, "items", []) or []
    for idx, item in enumerate(order_items, 1):
        u_price = _val(item, "unit_price", 0)
        qty = _val(item, "quantity", 1)
        subtot = _val(item, "subtotal") or (u_price * qty)
        total_paise = _val(item, "total") or subtot
        subtotal_paise += total_paise
        total_qty += int(qty or 0)

        # 18% standard GST assumption for electronics/appliances (prices are
        # GST-inclusive, so the tax component is backed out of the line total)
        taxable_paise = int(round(total_paise / 1.18))
        tax_paise = total_paise - taxable_paise
        total_taxable_paise += taxable_paise

        if is_intra_state:
            cgst_paise = int(round(tax_paise / 2))
            sgst_paise = tax_paise - cgst_paise
            igst_paise = 0
            total_cgst_paise += cgst_paise
            total_sgst_paise += sgst_paise
        else:
            cgst_paise = 0
            sgst_paise = 0
            igst_paise = tax_paise
            total_igst_paise += igst_paise

        hsn = _val(item, "hsn_code", "8517") or "8517"
        group = tax_groups.setdefault(str(hsn), {
            "hsn": str(hsn),
            "taxable_paise": 0, "cgst_paise": 0,
            "sgst_paise": 0, "igst_paise": 0,
        })
        group["taxable_paise"] += taxable_paise
        group["cgst_paise"] += cgst_paise
        group["sgst_paise"] += sgst_paise
        group["igst_paise"] += igst_paise

        serials = _val(item, "serial_numbers", []) or []
        if isinstance(serials, str):
            import json
            try:
                serials = json.loads(serials)
            except Exception:
                serials = [serials]

        imeis = _val(item, "imei_numbers", []) or []
        if isinstance(imeis, str):
            import json
            try:
                imeis = json.loads(imeis)
            except Exception:
                imeis = [imeis]

        items_data.append({
            "sl_no": idx,
            "article_id": str(_val(item, "product_id") or _val(item, "id") or "")[:8].upper(),
            "product_name": _val(item, "product_name", "Product"),
            "variant_name": _val(item, "variant_name"),
            "hsn_code": hsn,
            "quantity": qty,
            "serials": [s for s in serials if str(s).strip()] if isinstance(serials, list) else [],
            "imeis": [m for m in imeis if str(m).strip()] if isinstance(imeis, list) else [],
            "unit_price_inr": f"{(u_price / 100):.2f}",
            "taxable_inr": f"{(taxable_paise / 100):.2f}",
            "cgst_rate": "9%" if is_intra_state else "-",
            "cgst_inr": f"{(cgst_paise / 100):.2f}" if is_intra_state else "0.00",
            "sgst_rate": "9%" if is_intra_state else "-",
            "sgst_inr": f"{(sgst_paise / 100):.2f}" if is_intra_state else "0.00",
            "igst_rate": "18%" if not is_intra_state else "-",
            "igst_inr": f"{(igst_paise / 100):.2f}" if not is_intra_state else "0.00",
            "total_inr": f"{(total_paise / 100):.2f}",
        })

    total_tax_paise = (total_cgst_paise + total_sgst_paise + total_igst_paise)

    # Order-level money. The stored order total is authoritative for what the
    # customer paid; discounts and shipping come off/onto the sub total.
    discount_paise = int(_val(order, "discount_total", 0) or 0)
    shipping_paise = int(_val(order, "shipping_total", 0) or 0)
    stored_total = int(_val(order, "total", 0) or 0)
    computed_total = subtotal_paise - discount_paise + shipping_paise
    grand_total_paise = stored_total if stored_total > 0 else computed_total

    coupon_code = _val(order, "coupon_code")

    payment_method = str(_val(order, "payment_method") or "ONLINE").upper()
    payment_method_label = "Cash on Delivery" if payment_method == "COD" else "Prepaid (Online)"
    payment_ref = ""
    payment_provider = ""
    if payment:
        payment_ref = str(payment.get("provider_payment_id") or "") if isinstance(payment, dict) else str(getattr(payment, "provider_payment_id", "") or "")
        payment_provider = str(payment.get("provider") or "") if isinstance(payment, dict) else str(getattr(payment, "provider", "") or "")
    payment_amount_paise = int(payment.get("amount") or 0) if isinstance(payment, dict) else 0
    if payment_amount_paise <= 0:
        payment_amount_paise = grand_total_paise

    order_num = _val(order, "order_number") or str(_val(order, "id"))[:8]
    inv_num = _val(order, "invoice_number") or generate_invoice_number(order_num)
    inv_date = _val(order, "invoice_generated_at") or _val(order, "delivered_at") or datetime.now(timezone.utc)
    inv_date_str = inv_date.strftime("%d-%b-%Y") if hasattr(inv_date, "strftime") else str(inv_date)[:10]
    c_date = _val(order, "created_at") or datetime.now(timezone.utc)
    order_date_str = c_date.strftime("%d-%b-%Y") if hasattr(c_date, "strftime") else str(c_date)[:10]

    grand_total_inr = grand_total_paise / 100
    total_tax_inr = total_tax_paise / 100

    return {
        "invoice_number": inv_num,
        "invoice_date": inv_date_str,
        "order_number": order_num,
        "order_date": order_date_str,
        "payment_method": payment_method,
        "payment_method_label": payment_method_label,
        "payment": {
            "method": payment_method_label,
            "reference_id": payment_ref or ("COD" if payment_method == "COD" else ""),
            "provider": payment_provider or ("COD" if payment_method == "COD" else "—"),
            "amount_inr": f"{(payment_amount_paise / 100):.2f}",
        },
        "seller": {
            "name": seller_name,
            "address": seller_address,
            "address_line2": seller_address2,
            "city": seller_city,
            "state": seller_state,
            "state_code": seller_state_code,
            "pincode": seller_pincode,
            "gstin": seller_gstin,
            "pan": seller_pan,
            "email": seller_email,
            "phone": seller_phone,
        },
        "buyer": {
            "name": buyer_name,
            "phone": buyer_phone,
            "line1": buyer_line1,
            "line2": buyer_line2,
            "city": buyer_city,
            "state": buyer_state,
            "state_code": buyer_state_code,
            "pincode": buyer_pincode,
        },
        "items": items_data,
        "is_intra_state": is_intra_state,
        "total_items": len(items_data),
        "total_qty": total_qty,
        "subtotal_inr": f"{(subtotal_paise / 100):.2f}",
        "discount_inr": f"{(discount_paise / 100):.2f}",
        "coupon_code": coupon_code,
        "shipping_inr": f"{(shipping_paise / 100):.2f}",
        "tax_groups": [
            {
                "hsn": g["hsn"],
                "taxable_inr": f"{(g['taxable_paise'] / 100):.2f}",
                "cgst_rate": "9%" if is_intra_state else "-",
                "cgst_inr": f"{(g['cgst_paise'] / 100):.2f}",
                "sgst_rate": "9%" if is_intra_state else "-",
                "sgst_inr": f"{(g['sgst_paise'] / 100):.2f}",
                "igst_rate": "18%" if not is_intra_state else "-",
                "igst_inr": f"{(g['igst_paise'] / 100):.2f}",
                "total_tax_inr": f"{((g['cgst_paise'] + g['sgst_paise'] + g['igst_paise']) / 100):.2f}",
            }
            for g in tax_groups.values()
        ],
        "total_taxable_inr": f"{(total_taxable_paise / 100):.2f}",
        "total_cgst_inr": f"{(total_cgst_paise / 100):.2f}",
        "total_sgst_inr": f"{(total_sgst_paise / 100):.2f}",
        "total_igst_inr": f"{(total_igst_paise / 100):.2f}",
        "total_tax_inr": f"{total_tax_inr:.2f}",
        "grand_total_inr": f"{grand_total_inr:.2f}",
        "amount_in_words": num_to_words_inr(grand_total_inr),
        "tax_in_words": num_to_words_inr(total_tax_inr),
        "manual_invoice_url": getattr(order, "manual_invoice_url", None),
    }


_INVOICE_CSS = """
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #111;
        margin: 0;
        padding: 24px;
        background: #f9fafb;
    }
    .invoice-card {
        max-width: 860px;
        margin: 0 auto;
        background: #fff;
        padding: 32px;
        border: 1px solid #d1d5db;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .no-print {
        text-align: right;
        margin-bottom: 16px;
        max-width: 860px;
        margin: 0 auto 16px auto;
    }
    .print-btn {
        background: #0f172a;
        color: #fff;
        border: none;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
    }
    .print-btn:hover {
        background: #1e293b;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        font-size: 13px;
    }
    .meta-table td {
        padding: 2px 0;
        font-size: 12px;
        white-space: nowrap;
    }
    .meta-table td.k {
        color: #4b5563;
        padding-right: 12px;
    }
    .meta-table td.v {
        font-weight: 600;
    }
    @media print {
        body {
            background: #fff;
            padding: 0;
        }
        .invoice-card {
            border: none;
            box-shadow: none;
            padding: 0;
            width: 100%;
            max-width: 100%;
        }
        .no-print {
            display: none !important;
        }
    }
"""


def render_invoice_html(data: Dict[str, Any]) -> str:
    """Render a clean, pixel-perfect, print-ready Tax Invoice (Elektrix brand)."""
    items_rows = ""
    for item in data["items"]:
        meta_lines = []
        if item.get("serials"):
            serials_list = ", ".join(str(s) for s in item["serials"])
            meta_lines.append(f"<div>Serial No: <strong>{serials_list}</strong></div>")
        if item.get("imeis"):
            imeis_list = ", ".join(str(m) for m in item["imeis"])
            meta_lines.append(f"<div>IMEI: <strong>{imeis_list}</strong></div>")

        serials_html = ""
        if meta_lines:
            serials_html = f"<div style='font-size:11px;color:#333;font-family:monospace;margin-top:3px;line-height:1.4;'>{''.join(meta_lines)}</div>"

        variant_html = f"<span style='color:#666;font-size:12px;'> ({item['variant_name']})</span>" if item["variant_name"] else ""

        items_rows += f"""
        <tr>
            <td style="border:1px solid #111;padding:8px;text-align:center;">{item['sl_no']}</td>
            <td style="border:1px solid #111;padding:8px;font-family:monospace;font-size:11px;">{item['article_id']}</td>
            <td style="border:1px solid #111;padding:8px;">
                <strong>{item['product_name']}</strong>{variant_html}
                {serials_html}
            </td>
            <td style="border:1px solid #111;padding:8px;text-align:center;">{item['hsn_code']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:center;">{item['quantity']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:right;">₹{item['unit_price_inr']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:right;">₹{item['taxable_inr']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:right;">₹{item['cgst_inr']}<br><span style="font-size:10px;color:#555;">{item['cgst_rate']}</span></td>
            <td style="border:1px solid #111;padding:8px;text-align:right;">₹{item['sgst_inr']}<br><span style="font-size:10px;color:#555;">{item['sgst_rate']}</span></td>
            <td style="border:1px solid #111;padding:8px;text-align:right;font-weight:bold;">₹{item['total_inr']}</td>
        </tr>
        """

    tax_rows = ""
    for gi, grp in enumerate(data.get("tax_groups", []), 1):
        tax_rows += f"""
        <tr>
            <td style="border:1px solid #111;padding:6px 8px;text-align:center;">{gi}</td>
            <td style="border:1px solid #111;padding:6px 8px;text-align:center;">{grp['hsn']}</td>
            <td style="border:1px solid #111;padding:6px 8px;text-align:right;">₹{grp['taxable_inr']}</td>
            <td style="border:1px solid #111;padding:6px 8px;text-align:center;">{grp['cgst_rate']}</td>
            <td style="border:1px solid #111;padding:6px 8px;text-align:right;">₹{grp['cgst_inr']}</td>
            <td style="border:1px solid #111;padding:6px 8px;text-align:center;">{grp['sgst_rate']}</td>
            <td style="border:1px solid #111;padding:6px 8px;text-align:right;">₹{grp['sgst_inr']}</td>
            <td style="border:1px solid #111;padding:6px 8px;text-align:right;font-weight:bold;">₹{grp['total_tax_inr']}</td>
        </tr>
        """

    # Right-hand summary block: Sub Total → discounts → shipping → Grand Total
    discount_label = f"Coupon Discount ({data['coupon_code']})" if data.get("coupon_code") else "Discount"
    summary_rows = f"""
        <div style="display:flex; justify-content:space-between;">
            <span>Sub Total (Incl. GST):</span>
            <span>₹{data['subtotal_inr']}</span>
        </div>
    """
    discount_paise = int(round(float(data["discount_inr"]) * 100))
    shipping_paise = int(round(float(data["shipping_inr"]) * 100))
    if discount_paise > 0:
        summary_rows += f"""
        <div style="display:flex; justify-content:space-between; color:#047857;">
            <span>{discount_label}:</span>
            <span>- ₹{data['discount_inr']}</span>
        </div>
        """
    if shipping_paise > 0:
        summary_rows += f"""
        <div style="display:flex; justify-content:space-between;">
            <span>Shipping &amp; Handling:</span>
            <span>+ ₹{data['shipping_inr']}</span>
        </div>
        """
    summary_rows += f"""
        <div style="display:flex; justify-content:space-between;">
            <span>Total Taxable Amount:</span>
            <span>₹{data['total_taxable_inr']}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
            <span>Total Tax Amount:</span>
            <span>₹{data['total_tax_inr']}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:bold; border-top:2px solid #111; padding-top:6px; margin-top:6px;">
            <span>Grand Total:</span>
            <span>₹{data['grand_total_inr']}</span>
        </div>
    """

    seller_addr_html = data['seller']['address']
    if data['seller'].get('address_line2'):
        seller_addr_html += f"<br>{data['seller']['address_line2']}"

    manual_invoice_btn = ""
    if data.get("manual_invoice_url"):
        manual_invoice_btn = f"""
        <div style="margin-top:15px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
            <span>A physical store bill / invoice was also uploaded: </span>
            <a href="{data['manual_invoice_url']}" target="_blank" style="color:#15803d;font-weight:bold;text-decoration:underline;">View Uploaded Store Invoice</a>
        </div>
        """

    jurisdiction = (data['seller']['city'] or 'Gopalganj').upper()

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - {data['invoice_number']}</title>
    <style>{_INVOICE_CSS}</style>
</head>
<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="invoice-card">
        <!-- Header: real Elektrix logo + invoice meta -->
        <table style="border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px;">
            <tr>
                <td style="vertical-align:middle; width:55%;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="data:image/png;base64,{_ELEKTRIX_ICON_B64}" alt="Elektrix" style="height:46px; width:auto;">
                        <img src="data:image/png;base64,{_ELEKTRIX_WORDMARK_B64}" alt="ELEKTRIX" style="height:20px; width:auto;">
                    </div>
                    <div style="font-size:11px; color:#6b7280; margin-top:6px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
                        Marketplace · elektrix.in
                    </div>
                </td>
                <td style="vertical-align:top; width:45%; text-align:right;">
                    <h1 style="margin:0; font-size:22px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:#111827;">Tax Invoice</h1>
                    <div style="font-size:11px; color:#4b5563; margin-top:2px;">(Original for Recipient)</div>
                    <table class="meta-table" style="margin-top:10px; margin-left:auto; width:auto;">
                        <tr><td class="k">Invoice No:</td><td class="v" style="font-family:monospace; font-size:13px;">{data['invoice_number']}</td></tr>
                        <tr><td class="k">Invoice Date:</td><td class="v">{data['invoice_date']}</td></tr>
                        <tr><td class="k">Order No:</td><td class="v">{data['order_number']}</td></tr>
                        <tr><td class="k">Order Date:</td><td class="v">{data['order_date']}</td></tr>
                        <tr><td class="k">Reverse Charge:</td><td class="v">No</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Seller / Buyer / Ship To -->
        <table style="border: 1px solid #111; margin-bottom: 16px;">
            <tr style="background:#f3f4f6;">
                <th style="border:1px solid #111; padding:6px 10px; text-align:left; font-size:12px; width:34%;">Seller (Sold By)</th>
                <th style="border:1px solid #111; padding:6px 10px; text-align:left; font-size:12px; width:33%;">Billing Address (Buyer)</th>
                <th style="border:1px solid #111; padding:6px 10px; text-align:left; font-size:12px; width:33%;">Shipping Address (Consignee)</th>
            </tr>
            <tr>
                <td style="border:1px solid #111; padding:10px; vertical-align:top; font-size:12px; line-height:1.5;">
                    <strong style="text-transform:uppercase;">{data['seller']['name']}</strong><br>
                    {seller_addr_html}<br>
                    {data['seller']['city']}, {data['seller']['state']} - {data['seller']['pincode']}<br>
                    <strong>GSTIN:</strong> {data['seller']['gstin']}<br>
                    <strong>PAN:</strong> {data['seller']['pan'] or '—'}<br>
                    <strong>State:</strong> {data['seller']['state']} (Code: {data['seller']['state_code']})<br>
                    <strong>Email:</strong> {data['seller']['email']}<br>
                    <strong>Phone:</strong> {data['seller']['phone']}
                </td>
                <td style="border:1px solid #111; padding:10px; vertical-align:top; font-size:12px; line-height:1.5;">
                    <strong>{data['buyer']['name']}</strong><br>
                    {data['buyer']['line1']} {data['buyer']['line2']}<br>
                    {data['buyer']['city']}, {data['buyer']['state']} - {data['buyer']['pincode']}<br>
                    <strong>Phone:</strong> {data['buyer']['phone']}<br>
                    <strong>State:</strong> {data['buyer']['state']} (Code: {data['buyer']['state_code']})
                </td>
                <td style="border:1px solid #111; padding:10px; vertical-align:top; font-size:12px; line-height:1.5;">
                    <strong>{data['buyer']['name']}</strong><br>
                    {data['buyer']['line1']} {data['buyer']['line2']}<br>
                    {data['buyer']['city']}, {data['buyer']['state']} - {data['buyer']['pincode']}<br>
                    <strong>Phone:</strong> {data['buyer']['phone']}<br>
                    <strong>Place of Supply:</strong> {data['buyer']['state']} (Code: {data['buyer']['state_code']})
                </td>
            </tr>
        </table>

        <!-- Item Table -->
        <table style="border: 1px solid #111; margin-bottom: 16px;">
            <thead style="background:#f3f4f6;">
                <tr>
                    <th style="border:1px solid #111; padding:8px; width:4%;">S.No.</th>
                    <th style="border:1px solid #111; padding:8px; width:9%;">Article Id</th>
                    <th style="border:1px solid #111; padding:8px; width:26%; text-align:left;">Description of Goods</th>
                    <th style="border:1px solid #111; padding:8px; width:8%;">HSN/SAC</th>
                    <th style="border:1px solid #111; padding:8px; width:5%;">Qty</th>
                    <th style="border:1px solid #111; padding:8px; width:10%; text-align:right;">Unit Price</th>
                    <th style="border:1px solid #111; padding:8px; width:11%; text-align:right;">Taxable Amt</th>
                    <th style="border:1px solid #111; padding:8px; width:9%; text-align:right;">CGST</th>
                    <th style="border:1px solid #111; padding:8px; width:9%; text-align:right;">SGST</th>
                    <th style="border:1px solid #111; padding:8px; width:9%; text-align:right;">Total (₹)</th>
                </tr>
            </thead>
            <tbody>
                {items_rows}
            </tbody>
            <tfoot>
                <tr style="background:#fafafa; font-weight:bold;">
                    <td colspan="4" style="border:1px solid #111; padding:8px; text-align:right;">Total — Items: {data['total_items']} &nbsp;|&nbsp; Quantity: {data['total_qty']}</td>
                    <td style="border:1px solid #111; padding:8px; text-align:center;">{data['total_qty']}</td>
                    <td style="border:1px solid #111; padding:8px;"></td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['total_taxable_inr']}</td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['total_cgst_inr']}</td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['total_sgst_inr']}</td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['subtotal_inr']}</td>
                </tr>
            </tfoot>
        </table>

        <!-- HSN-wise Tax Summary -->
        <table style="border: 1px solid #111; margin-bottom: 16px;">
            <thead style="background:#f3f4f6;">
                <tr>
                    <th style="border:1px solid #111; padding:6px 8px; width:6%;">Sr.</th>
                    <th style="border:1px solid #111; padding:6px 8px; width:14%;">HSN Code</th>
                    <th style="border:1px solid #111; padding:6px 8px; width:16%; text-align:right;">Taxable Value</th>
                    <th style="border:1px solid #111; padding:6px 8px; width:9%;">CGST Rate</th>
                    <th style="border:1px solid #111; padding:6px 8px; width:12%; text-align:right;">CGST Amt</th>
                    <th style="border:1px solid #111; padding:6px 8px; width:9%;">SGST Rate</th>
                    <th style="border:1px solid #111; padding:6px 8px; width:12%; text-align:right;">SGST Amt</th>
                    <th style="border:1px solid #111; padding:6px 8px; width:14%; text-align:right;">Total Tax</th>
                </tr>
            </thead>
            <tbody>
                {tax_rows}
            </tbody>
            <tfoot>
                <tr style="background:#fafafa; font-weight:bold;">
                    <td colspan="2" style="border:1px solid #111; padding:6px 8px; text-align:right;">Total</td>
                    <td style="border:1px solid #111; padding:6px 8px; text-align:right;">₹{data['total_taxable_inr']}</td>
                    <td style="border:1px solid #111; padding:6px 8px;"></td>
                    <td style="border:1px solid #111; padding:6px 8px; text-align:right;">₹{data['total_cgst_inr']}</td>
                    <td style="border:1px solid #111; padding:6px 8px;"></td>
                    <td style="border:1px solid #111; padding:6px 8px; text-align:right;">₹{data['total_sgst_inr']}</td>
                    <td style="border:1px solid #111; padding:6px 8px; text-align:right;">₹{data['total_tax_inr']}</td>
                </tr>
            </tfoot>
        </table>

        <!-- Amount in words + summary -->
        <table style="border: 1px solid #111; margin-bottom: 16px;">
            <tr>
                <td style="padding:10px; width:60%; vertical-align:top; border-right:1px solid #111; font-size:12px;">
                    <strong>Amount Chargeable (in words):</strong><br>
                    <span style="font-style:italic;">{data['amount_in_words']}</span>
                </td>
                <td style="padding:10px; width:40%; vertical-align:top; font-size:12px; line-height:1.7;">
                    {summary_rows}
                </td>
            </tr>
        </table>

        <!-- Payment Details -->
        <table style="border: 1px solid #111; margin-bottom: 16px;">
            <thead style="background:#f3f4f6;">
                <tr>
                    <th style="border:1px solid #111; padding:6px 10px; text-align:left; font-size:12px;">Payment Method</th>
                    <th style="border:1px solid #111; padding:6px 10px; text-align:left; font-size:12px;">Payment Reference Id</th>
                    <th style="border:1px solid #111; padding:6px 10px; text-align:right; font-size:12px;">Amount (₹)</th>
                </tr>
            </thead>
            <tr>
                <td style="border:1px solid #111; padding:8px 10px; font-size:12px;">{data['payment']['method']}</td>
                <td style="border:1px solid #111; padding:8px 10px; font-size:12px; font-family:monospace;">{data['payment']['reference_id'] or '—'}</td>
                <td style="border:1px solid #111; padding:8px 10px; font-size:12px; text-align:right; font-weight:bold;">{data['payment']['amount_inr']}</td>
            </tr>
        </table>

        {manual_invoice_btn}

        <!-- Declaration & Signatures -->
        <table style="border: 1px solid #111; margin-top: 16px;">
            <tr>
                <td style="padding:12px; width:60%; vertical-align:top; font-size:11px; border-right:1px solid #111; color:#374151;">
                    <strong>Declaration:</strong><br>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.<br><br>
                    <em>SUBJECT TO {jurisdiction} JURISDICTION</em><br>
                    <em>This is a Computer Generated Invoice issued under the Information Technology Act, 2000.</em>
                </td>
                <td style="padding:12px; width:40%; text-align:center; vertical-align:bottom; font-size:12px;">
                    <div>for <strong>{data['seller']['name']}</strong></div>
                    <div style="margin-top:45px; border-top:1px dashed #9ca3af; padding-top:4px; font-weight:bold;">
                        Authorised Signatory
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
"""
