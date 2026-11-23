import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


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


def build_tax_invoice_data(order: Any, seller: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Calculate and structure invoice data adhering to Indian GST Rules."""
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
    seller_city = (seller.get("city") if seller else None) or "Gopalganj"
    seller_state = (seller.get("state") if seller else None) or "Bihar"
    seller_state_code = "10"
    seller_pincode = (seller.get("pincode") if seller else None) or "841508"
    seller_email = (seller.get("email") if seller else None) or "welcome.apana@gmail.com"
    seller_phone = (seller.get("phone") if seller else None) or "8539838942"

    shipping_addr = _val(order, "shipping_address") or {}
    buyer_name = _val(shipping_addr, "full_name") or _val(shipping_addr, "name") or "Valued Customer"
    buyer_phone = _val(shipping_addr, "phone") or ""
    buyer_line1 = _val(shipping_addr, "line1") or _val(shipping_addr, "street") or ""
    buyer_line2 = _val(shipping_addr, "line2") or ""
    buyer_city = _val(shipping_addr, "city") or ""
    buyer_state = _val(shipping_addr, "state") or "Bihar"
    buyer_state_code = "10" if "bihar" in buyer_state.lower() else "XX"
    buyer_pincode = _val(shipping_addr, "pincode") or ""

    is_intra_state = "bihar" in buyer_state.lower()

    items_data = []
    total_taxable_paise = 0
    total_cgst_paise = 0
    total_sgst_paise = 0
    total_igst_paise = 0
    grand_total_paise = 0

    order_items = _val(order, "items", []) or []
    for idx, item in enumerate(order_items, 1):
        u_price = _val(item, "unit_price", 0)
        qty = _val(item, "quantity", 1)
        subtot = _val(item, "subtotal") or (u_price * qty)
        total_paise = _val(item, "total") or subtot
        grand_total_paise += total_paise

        # 18% standard GST assumption for electronics/appliances
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
            "product_name": _val(item, "product_name", "Product"),
            "variant_name": _val(item, "variant_name"),
            "hsn_code": _val(item, "hsn_code", "8517") or "8517",
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
    grand_total_inr = grand_total_paise / 100
    total_tax_inr = total_tax_paise / 100

    order_num = _val(order, "order_number") or str(_val(order, "id"))[:8]
    inv_num = _val(order, "invoice_number") or generate_invoice_number(order_num)
    inv_date = _val(order, "invoice_generated_at") or _val(order, "delivered_at") or datetime.now(timezone.utc)
    inv_date_str = inv_date.strftime("%d-%b-%Y") if hasattr(inv_date, "strftime") else str(inv_date)[:10]
    c_date = _val(order, "created_at") or datetime.now(timezone.utc)
    order_date_str = c_date.strftime("%d-%b-%Y") if hasattr(c_date, "strftime") else str(c_date)[:10]

    return {
        "invoice_number": inv_num,
        "invoice_date": inv_date_str,
        "order_number": order_num,
        "order_date": order_date_str,
        "payment_method": (_val(order, "payment_method") or "ONLINE").upper(),
        "seller": {
            "name": seller_name,
            "address": seller_address,
            "city": seller_city,
            "state": seller_state,
            "state_code": seller_state_code,
            "pincode": seller_pincode,
            "gstin": seller_gstin,
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


def render_invoice_html(data: Dict[str, Any]) -> str:
    """Render a clean, pixel-perfect, print-ready Tax Invoice matching Apana & Reliance Retail standards."""
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
            <td style="border:1px solid #111;padding:8px;">
                <strong>{item['product_name']}</strong>{variant_html}
                {serials_html}
            </td>
            <td style="border:1px solid #111;padding:8px;text-align:center;">{item['hsn_code']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:center;">{item['quantity']} pcs</td>
            <td style="border:1px solid #111;padding:8px;text-align:right;">₹{item['taxable_inr']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:right;">₹{item['cgst_inr']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:right;">₹{item['sgst_inr']}</td>
            <td style="border:1px solid #111;padding:8px;text-align:right;font-weight:bold;">₹{item['total_inr']}</td>
        </tr>
        """

    manual_invoice_btn = ""
    if data.get("manual_invoice_url"):
        manual_invoice_btn = f"""
        <div style="margin-top:15px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
            <span>A physical store bill / invoice was also uploaded: </span>
            <a href="{data['manual_invoice_url']}" target="_blank" style="color:#15803d;font-weight:bold;text-decoration:underline;">View Uploaded Store Invoice</a>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - {data['invoice_number']}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 24px;
            background: #f9fafb;
        }}
        .invoice-card {{
            max-width: 860px;
            margin: 0 auto;
            background: #fff;
            padding: 32px;
            border: 1px solid #d1d5db;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }}
        .no-print {{
            text-align: right;
            margin-bottom: 16px;
            max-width: 860px;
            margin: 0 auto 16px auto;
        }}
        .print-btn {{
            background: #0f172a;
            color: #fff;
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
        }}
        .print-btn:hover {{
            background: #1e293b;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th, td {{
            font-size: 13px;
        }}
        @media print {{
            body {{
                background: #fff;
                padding: 0;
            }}
            .invoice-card {{
                border: none;
                box-shadow: none;
                padding: 0;
                width: 100%;
                max-width: 100%;
            }}
            .no-print {{
                display: none !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="invoice-card">
        <!-- Header -->
        <table style="border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px;">
            <tr>
                <td style="vertical-align:top; width:60%;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:24px; font-weight:900; letter-spacing:-0.5px; color:#f59e0b;">ELEKTRIX</span>
                        <span style="font-size:12px; color:#6b7280; font-weight:600; text-transform:uppercase;">Marketplace</span>
                    </div>
                    <h2 style="margin:4px 0 2px 0; font-size:18px; text-transform:uppercase; font-weight:800;">{data['seller']['name']}</h2>
                    <div style="font-size:12px; color:#374151; line-height:1.4;">
                        {data['seller']['address']}<br>
                        {data['seller']['city']}, {data['seller']['state']} - {data['seller']['pincode']}<br>
                        <strong>GSTIN:</strong> {data['seller']['gstin']} | <strong>State:</strong> {data['seller']['state']} (Code: {data['seller']['state_code']})<br>
                        <strong>Email:</strong> {data['seller']['email']} | <strong>Phone:</strong> {data['seller']['phone']}
                    </div>
                </td>
                <td style="vertical-align:top; width:40%; text-align:right;">
                    <h1 style="margin:0; font-size:22px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:#111827;">Tax Invoice</h1>
                    <div style="font-size:11px; color:#4b5563; margin-top:2px;">(Original for Recipient)</div>
                    <div style="margin-top:10px; font-size:12px; line-height:1.5;">
                        <strong>Invoice No:</strong> <span style="font-family:monospace;font-size:13px;font-weight:bold;">{data['invoice_number']}</span><br>
                        <strong>Invoice Date:</strong> {data['invoice_date']}<br>
                        <strong>Order ID:</strong> {data['order_number']}<br>
                        <strong>Order Date:</strong> {data['order_date']}<br>
                        <strong>Payment:</strong> {data['payment_method']}
                    </div>
                </td>
            </tr>
        </table>

        <!-- Buyer & Shipping Info -->
        <table style="border: 1px solid #111; margin-bottom: 16px;">
            <tr style="background:#f3f4f6;">
                <th style="border:1px solid #111; padding:6px 10px; text-align:left; font-size:12px;">Bill To (Buyer)</th>
                <th style="border:1px solid #111; padding:6px 10px; text-align:left; font-size:12px;">Ship To (Delivery Destination)</th>
            </tr>
            <tr>
                <td style="border:1px solid #111; padding:10px; vertical-align:top; width:50%; font-size:12px; line-height:1.4;">
                    <strong>{data['buyer']['name']}</strong><br>
                    {data['buyer']['line1']} {data['buyer']['line2']}<br>
                    {data['buyer']['city']}, {data['buyer']['state']} - {data['buyer']['pincode']}<br>
                    <strong>Phone:</strong> {data['buyer']['phone']}<br>
                    <strong>State:</strong> {data['buyer']['state']} (Code: {data['buyer']['state_code']})
                </td>
                <td style="border:1px solid #111; padding:10px; vertical-align:top; width:50%; font-size:12px; line-height:1.4;">
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
                    <th style="border:1px solid #111; padding:8px; width:5%;">Sl</th>
                    <th style="border:1px solid #111; padding:8px; width:45%; text-align:left;">Description of Goods</th>
                    <th style="border:1px solid #111; padding:8px; width:10%;">HSN/SAC</th>
                    <th style="border:1px solid #111; padding:8px; width:8%;">Qty</th>
                    <th style="border:1px solid #111; padding:8px; width:12%; text-align:right;">Taxable Amt</th>
                    <th style="border:1px solid #111; padding:8px; width:10%; text-align:right;">CGST (9%)</th>
                    <th style="border:1px solid #111; padding:8px; width:10%; text-align:right;">SGST (9%)</th>
                    <th style="border:1px solid #111; padding:8px; width:10%; text-align:right;">Total (₹)</th>
                </tr>
            </thead>
            <tbody>
                {items_rows}
            </tbody>
            <tfoot>
                <tr style="background:#fafafa; font-weight:bold;">
                    <td colspan="4" style="border:1px solid #111; padding:8px; text-align:right;">Total</td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['total_taxable_inr']}</td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['total_cgst_inr']}</td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['total_sgst_inr']}</td>
                    <td style="border:1px solid #111; padding:8px; text-align:right;">₹{data['grand_total_inr']}</td>
                </tr>
            </tfoot>
        </table>

        <!-- Summary & Words -->
        <table style="border: 1px solid #111; margin-bottom: 16px;">
            <tr>
                <td style="padding:10px; width:65%; vertical-align:top; border-right:1px solid #111;">
                    <div style="font-size:12px; margin-bottom:6px;">
                        <strong>Amount Chargeable (in words):</strong><br>
                        <span style="font-style:italic;">{data['amount_in_words']}</span>
                    </div>
                    <div style="font-size:12px;">
                        <strong>Tax Amount (in words):</strong><br>
                        <span style="font-style:italic;">{data['tax_in_words']}</span>
                    </div>
                </td>
                <td style="padding:10px; width:35%; vertical-align:top; font-size:12px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between;">
                        <span>Taxable Amount:</span>
                        <span>₹{data['total_taxable_inr']}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Total Tax (GST):</span>
                        <span>₹{data['total_tax_inr']}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; border-top:1px solid #111; padding-top:4px; margin-top:4px;">
                        <span>Grand Total:</span>
                        <span>₹{data['grand_total_inr']}</span>
                    </div>
                </td>
            </tr>
        </table>

        {manual_invoice_btn}

        <!-- Declaration & Signatures -->
        <table style="border: 1px solid #111; margin-top: 16px;">
            <tr>
                <td style="padding:12px; width:60%; vertical-align:top; font-size:11px; border-right:1px solid #111; color:#374151;">
                    <strong>Declaration:</strong><br>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.<br><br>
                    <em>SUBJECT TO GOPALGANJ JURISDICTION</em><br>
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
