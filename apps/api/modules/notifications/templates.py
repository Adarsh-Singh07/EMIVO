"""Email templates for transactional notifications. Plain-PHP-style string
templates — no template engine dependency, easy to audit."""

BRAND = "ELEKTRIX"
PRIMARY = "#6d28d9"


def _shell(title: str, body_html: str, cta_url: str = "", cta_label: str = "") -> str:
    logo = "https://elektrix.in/branding/icon.png"
    wordmark = "https://elektrix.in/branding/wordmark.png"
    cta = (
        f'<a href="{cta_url}" style="display:inline-block;background:#0a0a0a;color:#ffffff;'
        f'text-decoration:none;padding:14px 36px;border-radius:999px;font-weight:600;font-size:14px;">'
        f'{cta_label}</a>' if cta_url else ""
    )
    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden">{title}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <!-- Header -->
    <tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:22px 32px;" align="center">
      <img src="{logo}" alt="ELEKTRIX" width="44" height="44" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:3px;vertical-align:middle;margin-left:10px;">ELEKTRIX</span>
    </td></tr>
    <!-- Body -->
    <tr><td style="background:#ffffff;padding:36px 32px;">
      <h2 style="margin:0 0 18px;font-size:21px;color:#0a0a0a;">{title}</h2>
      <div style="font-size:15px;line-height:1.65;color:#3f3f46;">{body_html}</div>
      {('' if not cta else '<div style="text-align:center;margin:30px 0 6px;">' + cta + '</div>')}
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#18181b;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
        Questions? We're here to help —
        <a href="https://elektrix.in/support" style="color:#ffffff;text-decoration:underline;">Support</a> &nbsp;·&nbsp;
        <a href="https://elektrix.in/account/orders" style="color:#ffffff;text-decoration:underline;">My Orders</a>
      </p>
      <p style="margin:10px 0 0;font-size:11px;color:#71717a;">
        Apna Enterprises | DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj, Bihar - 841508<br/>
        You're receiving this email because you have an ELEKTRIX account.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""


def _order_table(items: list) -> str:
    rows = "".join(
        f"<tr>"
        f"<td style='padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#18181b;'>{i.get('name','')}</td>"
        f"<td style='padding:10px 8px;border-bottom:1px solid #e4e4e7;text-align:center;color:#52525b;'>{i.get('qty','')}</td>"
        f"<td style='padding:10px 8px;border-bottom:1px solid #e4e4e7;text-align:right;color:#18181b;'>₹{i.get('unit_price', 0) / 100:,.0f}</td>"
        f"</tr>"
        for i in items
    )
    return (
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' "
        "style='margin:18px 0;border:1px solid #e4e4e7;border-radius:12px;'>"
        "<tr style='background:#fafafa;'>"
        "<th style='padding:10px 8px;text-align:left;font-size:12px;color:#71717a;text-transform:uppercase;'>Product</th>"
        "<th style='padding:10px 8px;text-align:center;font-size:12px;color:#71717a;text-transform:uppercase;'>Qty</th>"
        "<th style='padding:10px 8px;text-align:right;font-size:12px;color:#71717a;text-transform:uppercase;'>Price</th>"
        "</tr>" + rows + "</table>"
    )



def _rupees(paise: int) -> str:
    return f"₹{paise / 100:,.0f}"


def _items_table(items: list) -> str:
    if not items:
        return ""
    rows = "".join(
        f"<tr><td style='padding:6px 0'>{i.get('name','Item')} × {i.get('qty',1)}</td>"
        f"<td style='padding:6px 0;text-align:right'>{_rupees(i.get('unit_price',0) * i.get('qty',1))}</td></tr>"
        for i in items
    )
    return f"<table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:14px'>{rows}</table>"


def payment_captured(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Your payment of <b>{_rupees(p.get('amount', 0))}</b> for order "
        f"<b>{p.get('order_number','')}</b> was received. Your order is confirmed and "
        "will be processed shortly."
    )
    return (
        f"Payment received · {p.get('order_number','')}",
        _shell("Payment successful", body, f"{storefront_url}/account/orders", "View order"),
    )


def payment_failed(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"We couldn't process the payment for order <b>{p.get('order_number','')}</b> "
        f"({p.get('reason', 'payment declined')}). Your order was cancelled and any "
        "reserved items released. You can place the order again anytime."
    )
    return (
        f"Payment failed · {p.get('order_number','')}",
        _shell("Payment failed", body, f"{storefront_url}/cart", "Try again"),
    )


def order_created(p: dict, storefront_url: str) -> tuple[str, str]:
    name = p.get("first_name") or "there"
    items = p.get("items", [])
    body = (
        f"Hi {name}, thanks for shopping with us!"
        f"<br/><br/>Your order <b>{p.get('order_number','')}</b> is confirmed"
        f" ({'Cash on Delivery' if p.get('payment_method') == 'COD' else 'online payment'})."
        f"{_order_table(items) if items else ''}"
        f"<div style='font-size:17px;text-align:right'><b>Total: {_rupees(p.get('total', 0))}</b></div>"
        "<br/>We're getting it ready — you'll get updates at every step."
    )
    subject = f"Order confirmed: {p.get('order_number', '')} — thanks, {name}!"
    return subject, _shell("Your order is confirmed", body,
                           f"{storefront_url}/account/orders", "Track your order")


def payment_captured(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"We've received your payment for order <b>{p.get('order_number','')}</b> —"
        f" <b>{_rupees(p.get('total', 0))}</b>. Your order is now being prepared."
    )
    subject = f"Payment received — order {p.get('order_number', '')} is being prepared"
    return subject, _shell("Payment successful", body,
                           f"{storefront_url}/account/orders", "View order")


def order_shipped(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Good news! Order <b>{p.get('order_number','')}</b> has shipped."
        + (f"<br/>Tracking: <b>{p.get('tracking_number','')}</b>" if p.get('tracking_number') else "")
        + "<br/><br/>You can follow it every step of the way."
    )
    subject = f"Your order {p.get('order_number', '')} has shipped 🚚"
    return subject, _shell("On its way", body,
                           f"{storefront_url}/account/orders", "Track shipment")


def order_delivered(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Order <b>{p.get('order_number','')}</b> has been delivered. Enjoy!"
        "<br/><br/>If anything's not right, our support team is one tap away."
    )
    subject = f"Delivered: order {p.get('order_number', '')}"
    return subject, _shell("Delivered", body, f"{storefront_url}/account/orders", "View order")


def order_cancelled(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Order <b>{p.get('order_number','')}</b> has been cancelled as requested."
        " Any reserved stock has been released. No further charges apply."
    )
    subject = f"Order {p.get('order_number', '')} cancelled"
    return subject, _shell("Order cancelled", body, storefront_url, "Continue shopping")


def payment_failed(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"The payment for order <b>{p.get('order_number','')}</b> didn't go through —"
        " <b>no money was charged</b>."
        "<br/><br/>Your items are reserved. You can retry the payment from My Orders"
        " within 2 hours."
    )
    subject = f"Action needed: payment for order {p.get('order_number', '')} didn't go through"
    return subject, _shell("Payment failed", body,
                           f"{storefront_url}/account/orders", "Retry payment")


def cart_reminder(p: dict, storefront_url: str) -> tuple[str, str]:
    name = p.get("first_name") or "there"
    items = p.get("items", [])
    rows = "".join(
        f"<li style='margin:4px 0;color:#18181b;'>{i.get('name','')} — {_rupees(i.get('unit_price', 0))}</li>"
        for i in items[:5]
    )
    body = (
        f"Hi {name}, you left something in your cart!"
        f"<ul style='padding-left:18px;margin:14px 0;'>{rows}</ul>"
        + ("These are popular items — stock isn't guaranteed to wait for you."
           if p.get("stage") == "3d" else
           "Popular items can sell out — don't wait too long!")
    )
    subject = ("Still thinking it over? Your cart is waiting" if p.get("stage") == "3d"
               else "You left items in your cart")
    return subject, _shell("Your cart is waiting", body, f"{storefront_url}/cart", "Return to cart")



def order_shipped(p: dict, storefront_url: str) -> tuple[str, str]:
    tracking = ""
    if p.get("tracking_number"):
        tracking = f"<br/>Tracking number: <b>{p['tracking_number']}</b>"
    link = p.get("tracking_url") or f"{storefront_url}/account/orders"
    body = (
        f"Good news — order <b>{p.get('order_number','')}</b> has been shipped and is on "
        f"its way to you.{tracking}"
    )
    return (
        f"Your order has shipped · {p.get('order_number','')}",
        _shell("Shipped 📦", body, link, "Track shipment"),
    )


def order_delivered(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Order <b>{p.get('order_number','')}</b> has been delivered. Enjoy your purchase — "
        "we'd love to see you again soon!"
    )
    return (
        f"Delivered · {p.get('order_number','')}",
        _shell("Delivered ✅", body, storefront_url, "Shop again"),
    )


def order_cancelled(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Order <b>{p.get('order_number','')}</b> has been cancelled. "
        "If you paid online, your refund (if any) will be processed to your original "
        "payment method."
    )
    return (
        f"Order cancelled · {p.get('order_number','')}",
        _shell("Order cancelled", body, storefront_url, "Shop again"),
    )


def order_refunded(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"A refund of <b>{_rupees(p.get('refund_amount', 0))}</b> for order "
        f"<b>{p.get('order_number','')}</b> has been initiated. It typically reaches your "
        "original payment method within 5-7 business days."
    )
    return (
        f"Refund initiated · {p.get('order_number','')}",
        _shell("Refund initiated", body, storefront_url, "View order"),
    )


def password_reset(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        "We received a request to reset your ELEKTRIX password.<br/><br/>"
        "This link is valid for <b>30 minutes</b> and can be used only once.<br/><br/>"
        "If you didn't request this, you can safely ignore this email."
    )
    link = f"{storefront_url}/reset-password?token={p.get('token','')}"
    return "Reset your ELEKTRIX password", _shell("Password reset", body, link, "Reset password")


def welcome(p: dict, storefront_url: str) -> tuple[str, str]:
    name = p.get("first_name") or "there"
    body = (
        f"Welcome to ELEKTRIX, {name}!<br/><br/>"
        "Your account is ready. Browse the festival collection, save your wishlist, "
        "and check out faster next time."
    )
    return "Welcome to ELEKTRIX ⚡", _shell("Welcome!", body, storefront_url, "Start shopping")


def otp_login(p: dict, storefront_url: str) -> tuple[str, str]:
    code = p.get("code", "")
    if p.get("requested_phone"):
        intro = (
            f"We couldn't send an SMS to your number ending in {p.get('phone_last4') or '****'} "
            "right now, so your sign-in code is below. It works the same way."
            "<br/><br/>"
        )
    else:
        intro = ""
    body = (
        f"{intro}"
        "Use this one-time code to sign in to your ELEKTRIX account:"
        f"<br/><br/><div style='font-size:32px;letter-spacing:8px;font-weight:bold;"
        f"color:#0f172a;text-align:center;padding:16px;background:#f3f4f6;"
        f"border-radius:8px;'>{code}</div><br/>"
        "This code expires in <b>10 minutes</b> and can be used only once.<br/><br/>"
        "If you didn't request it, ignore this email — your account stays secure."
    )
    return "Your ELEKTRIX sign-in code", _shell("One-time sign-in code", body)


def low_stock_alert(p: dict, storefront_url: str) -> tuple[str, str]:
    """Internal staff digest — delivered to the admin@ alias by the worker."""
    items = p.get("items", [])
    rows = "".join(
        f"<tr>"
        f"<td style='padding:8px 12px;color:#18181b;'>{i.get('name','')}"
        + (f" <span style='color:#9ca3af;font-size:12px;'>({i['sku']})</span>" if i.get("sku") else "")
        + "</td>"
        f"<td style='padding:8px 12px;text-align:center;font-weight:bold;color:#b91c1c;'>{i.get('available',0)}</td>"
        f"<td style='padding:8px 12px;text-align:center;color:#6b7280;'>{i.get('threshold',0)}</td>"
        f"</tr>"
        for i in items[:20]
    )
    body = (
        f"<b>{p.get('count', len(items))}</b> product(s) are at or below their low-stock "
        "threshold and need restocking:<br/><br/>"
        "<table width='100%' cellpadding='0' cellspacing='0' "
        "style='border-collapse:collapse;background:#f9fafb;border-radius:8px;'>"
        "<tr style='color:#6b7280;font-size:12px;text-transform:uppercase;'>"
        "<th style='padding:8px 12px;text-align:left;'>Product</th>"
        "<th style='padding:8px 12px;'>Available</th>"
        "<th style='padding:8px 12px;'>Threshold</th>"
        f"</tr>{rows}</table><br/>"
        f"Restock soon so listings don't go dark — <a href='{storefront_url}/shop' "
        "style='color:#b45309;'>check the storefront</a> to see what customers see."
    )
    return "Low stock alert: restock needed", _shell("Low stock alert", body)




def weekly_digest(p: dict, storefront_url: str) -> tuple[str, str]:
    """Internal staff digest — delivered to the admin@ alias by the worker."""
    def _rupees(v):
        return f"₹{round(v / 100):,}"

    rows = [
        ("Orders placed", str(p.get("orders", 0))),
        ("Revenue (excl. pending/cancelled)", _rupees(p.get("revenue", 0))),
        ("Cancelled orders", str(p.get("cancelled", 0))),
        ("New customers", str(p.get("new_customers", 0))),
        ("Failed payments", str(p.get("failed_payments", 0))),
        ("Abandoned-cart value", _rupees(p.get("abandoned_value", 0))),
        ("Open support tickets", str(p.get("tickets", 0))),
        ("Low-stock products", str(p.get("low_stock", 0))),
    ]
    trs = "".join(
        f"<tr><td style='padding:8px 12px;color:#6b7280;'>{k}</td>"
        f"<td style='padding:8px 12px;text-align:right;font-weight:bold;color:#18181b;'>{v}</td></tr>"
        for k, v in rows
    )
    body = (
        "Here is how ELEKTRIX did over the last 7 days:"
        f"<br/><br/><table width='100%' cellpadding='0' cellspacing='0' "
        "style='border-collapse:collapse;background:#f9fafb;border-radius:8px;'>"
        f"{trs}</table><br/>"
        f"<a href='{storefront_url}' style='color:#b45309;'>View the storefront</a> "
        "&middot; manage ops in the admin panel."
    )
    return "Your weekly ELEKTRIX recap", _shell("Weekly recap", body)




def marketing_broadcast(p: dict, storefront_url: str) -> tuple[str, str]:
    """Campaign mail from the hello@ alias: custom copy + optional coupon."""
    name = p.get("first_name") or "there"
    coupon = p.get("coupon")
    coupon_html = ""
    if coupon:
        value = (
            f"{coupon['discount_value']}% OFF"
            if coupon["discount_type"] == "PERCENTAGE"
            else f"₹{round(coupon['discount_value'] / 100):,} OFF"
        )
        min_order = (
            f" on orders above ₹{round(coupon['min_order_amount'] / 100):,}"
            if coupon.get("min_order_amount") else ""
        )
        coupon_html = (
            "<br/><br/>Use this code at checkout:"
            f"<br/><div style='font-size:28px;letter-spacing:6px;font-weight:bold;"
            f"color:#b45309;text-align:center;padding:14px;background:#fffbeb;"
            f"border:2px dashed #f59e0b;border-radius:8px;'>{coupon['code']}</div>"
            f"<p style='text-align:center;color:#6b7280;font-size:13px;'>"
            f"{value}{min_order} &mdash; valid for a limited time.</p>"
        )
    body = (
        f"Hi {name},<br/><br/>"
        f"{p.get('message', '').replace(chr(10), '<br/>')}"
        f"{coupon_html}"
        f"<br/><br/><a href='{storefront_url}/shop' "
        "style='display:inline-block;background:#18181b;color:#ffffff;"
        "padding:12px 28px;border-radius:999px;font-weight:bold;"
        "text-decoration:none;'>Shop now</a>"
    )
    return p.get("subject") or "A little something from ELEKTRIX", _shell(
        p.get("subject") or "A little something from ELEKTRIX", body,
        f"{storefront_url}/shop", "Shop now",
    )


TEMPLATES = {
    "order.created": order_created,
    "payment.captured": payment_captured,
    "payment.failed": payment_failed,
    "order.shipped": order_shipped,
    "order.delivered": order_delivered,
    "order.cancelled": order_cancelled,
    "order.refunded": order_refunded,
    "auth.password_reset": password_reset,
    "auth.welcome": welcome,
    "auth.otp_login": otp_login,
    "cart.reminder": cart_reminder,
    "inventory.low_stock": low_stock_alert,
    "admin.weekly_digest": weekly_digest,
    "marketing.broadcast": marketing_broadcast,
}
