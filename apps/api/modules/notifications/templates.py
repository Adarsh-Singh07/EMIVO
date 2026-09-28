"""ELEKTRIX transactional email templates.

Design system v2 (2026-09-29), benchmarked against Amazon / Apple / Shopify
transactional receipts (see docs/audit/ for the research notes):

- Single-column, 600px table-based layout, all styling inline (Gmail-safe).
- White header with the ELEKTRIX wordmark left (brand accent strip on top),
  order metadata right where applicable.
- Status pills (CONFIRMED / SHIPPED / DELIVERED / FAILED …) for instant state.
- One prominent ink CTA button per email.
- Itemised order table with right-aligned totals; COD/prepaid chip.
- Light legal footer with the full registered business identity.

Every function keeps the original signature (payload dict, storefront_url)
and returns (subject, html). The TEMPLATES map keys are the outbox contract —
never rename them without updating the worker.
"""

BRAND = "ELEKTRIX"
WORDMARK_URL = "https://elektrix.in/branding/wordmark.png"
SITE = "https://elektrix.in"

INK = "#0a0a0a"
MUTED = "#52525b"
FAINT = "#71717a"
LINE = "#e4e4e7"
PAPER = "#f4f4f5"
GREEN = "#059669"
RED = "#dc2626"
AMBER = "#b45309"

LEGAL = (
    "M/S APANA ENTERPRISES &middot; DS1, 109, Near Indian Petrol Pump, "
    "Vijayipur, Gopalganj, Bihar 841508 &middot; GSTIN: 10COMPG4070G1ZB"
)


def _pill(text: str, color: str) -> str:
    return (
        f'<span style="display:inline-block;background:{color}14;color:{color};'
        f'border:1px solid {color}33;border-radius:999px;padding:6px 14px;'
        f'font-size:11px;font-weight:700;letter-spacing:1.5px;">{text}</span>'
    )


def _meta_chip(text: str) -> str:
    return (
        f'<span style="display:inline-block;background:{INK};color:#ffffff;'
        f'border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;'
        f'letter-spacing:0.5px;">{text}</span>'
    )


def _cta(url: str, label: str) -> str:
    if not url:
        return ""
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" align="center" '
        f'style="margin:30px auto 4px;"><tr><td align="center" bgcolor="{INK}" '
        f'style="border-radius:12px;">'
        f'<a href="{url}" style="display:inline-block;background:{INK};color:#ffffff;'
        f'text-decoration:none;padding:15px 44px;border-radius:12px;font-weight:600;'
        f'font-size:15px;">{label}</a></td></tr></table>'
    )


def _shell(
    title: str,
    body_html: str,
    cta_url: str = "",
    cta_label: str = "",
    preheader: str = "",
    header_meta: str = "",
    pill: str = "",
) -> str:
    wordmark = (
        f'<a href="{SITE}" style="text-decoration:none;">'
        f'<img src="{WORDMARK_URL}" alt="ELEKTRIX" height="30" '
        f'style="display:block;border:0;" /></a>'
    )
    meta = f'<td align="right" valign="middle">{_meta_chip(header_meta)}</td>' if header_meta else ""
    pill_html = f'<div style="margin:0 0 16px;">{_pill(*pill)}</div>' if pill else ""
    pre = preheader or title
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>{title}</title></head>
<body style="margin:0;padding:0;background:{PAPER};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAPER};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0"
         style="max-width:600px;width:100%;background:#ffffff;border:1px solid {LINE};border-radius:14px;overflow:hidden;">
    <!-- Brand accent -->
    <tr><td style="height:4px;background:{GREEN};font-size:0;line-height:0;">&nbsp;</td></tr>
    <!-- Header -->
    <tr><td style="padding:20px 6% 18px;border-bottom:1px solid {LINE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left" valign="middle">{wordmark}</td>{meta}
      </tr></table>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:34px 7% 10px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      {pill_html}
      <h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;color:{INK};">{title}</h1>
      <div style="font-size:15px;line-height:1.65;color:{MUTED};">{body_html}</div>
      {_cta(cta_url, cta_label)}
    </td></tr>
    <!-- Help strip -->
    <tr><td style="padding:26px 7% 26px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="background:{PAPER};border:1px solid {LINE};border-radius:12px;padding:14px 18px;text-align:center;">
        <span style="font-size:13px;color:{FAINT};">Need help?</span>&nbsp;&nbsp;
        <a href="{SITE}/order-tracking" style="color:{INK};font-size:13px;font-weight:600;text-decoration:none;">Track an order</a>
        &nbsp;<span style="color:{LINE};">|</span>&nbsp;
        <a href="{SITE}/support" style="color:{INK};font-size:13px;font-weight:600;text-decoration:none;">Support</a>
        &nbsp;<span style="color:{LINE};">|</span>&nbsp;
        <a href="{SITE}/faq" style="color:{INK};font-size:13px;font-weight:600;text-decoration:none;">FAQs</a>
      </div>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#fafafa;border-top:1px solid {LINE};padding:22px 7%;text-align:center;
                  font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <p style="margin:0 0 8px;font-size:11px;line-height:1.7;color:{FAINT};">{LEGAL}</p>
      <p style="margin:0 0 8px;font-size:12px;color:{FAINT};">
        <a href="{SITE}" style="color:{MUTED};text-decoration:none;font-weight:600;">elektrix.in</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:support@elektrix.in" style="color:{MUTED};text-decoration:none;">support@elektrix.in</a>
        &nbsp;&middot;&nbsp;
        <a href="tel:+918092024066" style="color:{MUTED};text-decoration:none;">+91 80920 24066</a>
      </p>
      <p style="margin:0;font-size:10.5px;color:#a1a1aa;">
        You're receiving this email because you have an ELEKTRIX account.<br/>
        &copy; {BRAND} — all prices include GST where applicable.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""


def _rupees(paise: float) -> str:
    return f"₹{round(paise / 100):,}"


def _items_table(items: list) -> str:
    if not items:
        return ""
    rows = "".join(
        "<tr>"
        f"<td style='padding:12px 4px;border-bottom:1px solid {LINE};color:{INK};font-size:14px;'>"
        f"{i.get('name','Item')}</td>"
        f"<td style='padding:12px 4px;border-bottom:1px solid {LINE};text-align:center;"
        f"color:{MUTED};font-size:14px;'>{i.get('qty', 1)}</td>"
        f"<td style='padding:12px 4px;border-bottom:1px solid {LINE};text-align:right;"
        f"color:{INK};font-size:14px;font-weight:600;'>"
        f"{_rupees(i.get('unit_price', 0) * i.get('qty', 1))}</td>"
        "</tr>"
        for i in items
    )
    subtotal = sum(i.get("unit_price", 0) * i.get("qty", 1) for i in items)
    return (
        f"<table role='presentation' width='100%' cellpadding='0' cellspacing='0' "
        f"style='margin:22px 0 8px;border:1px solid {LINE};border-radius:12px;border-collapse:separate;'>"
        "<tr style='background:#fafafa;'>"
        "<th style='padding:10px 4px;text-align:left;font-size:11px;color:#a1a1aa;"
        "letter-spacing:1.2px;text-transform:uppercase;'>Item</th>"
        "<th style='padding:10px 4px;text-align:center;font-size:11px;color:#a1a1aa;"
        "letter-spacing:1.2px;text-transform:uppercase;'>Qty</th>"
        "<th style='padding:10px 4px;text-align:right;font-size:11px;color:#a1a1aa;"
        "letter-spacing:1.2px;text-transform:uppercase;'>Amount</th>"
        f"</tr>{rows}"
        "<tr><td colspan='2' style='padding:12px 4px;text-align:right;color:#3f3f46;"
        f"font-size:13px;'>Subtotal</td>"
        f"<td style='padding:12px 4px;text-align:right;color:{INK};font-size:13px;'>{_rupees(subtotal)}</td></tr>"
        "</table>"
    )


def _pay_chip(payment_method: str) -> str:
    if not payment_method:
        return ""
    label = "Cash on Delivery" if payment_method == "COD" else "Paid online"
    return (
        f'<div style="margin:16px 0 0;"><span style="display:inline-block;background:{PAPER};'
        f'border:1px solid {LINE};border-radius:8px;padding:6px 12px;font-size:12px;'
        f'color:{MUTED};">Payment: {label}</span></div>'
    )


def _order_link(storefront_url: str) -> str:
    return f"{storefront_url}/account/orders"


def payment_failed(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"We couldn't collect the payment for order <b style='color:{INK};'>"
        f"{p.get('order_number','')}</b> ({p.get('reason', 'payment declined')}). "
        "<b style='color:#3f3f46;'>No money was charged</b> — your items stay reserved, "
        "and you can safely retry from My Orders within 2 hours."
    )
    return (
        f"Action needed: payment for order {p.get('order_number','')} didn't go through",
        _shell("Payment didn't go through", body, _order_link(storefront_url), "Retry payment",
               preheader=f"{p.get('order_number','')} — no charge was made. Retry within 2 hours.",
               header_meta=f"ORDER {p.get('order_number','')}",
               pill=("PAYMENT FAILED", RED)),
    )


def order_created(p: dict, storefront_url: str) -> tuple[str, str]:
    name = p.get("first_name") or "there"
    items = p.get("items", [])
    body = (
        f"Hi {name}, thank you for shopping with ELEKTRIX. Your order is confirmed and "
        "our team is preparing it for dispatch — you'll receive an update at every step."
        f"{_items_table(items)}"
        f"<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:6px 0 0;'>"
        f"<tr><td style='text-align:right;color:{MUTED};font-size:14px;padding:4px 4px;'>Total</td>"
        f"<td style='text-align:right;color:{INK};font-size:18px;font-weight:700;padding:4px 4px;'>"
        f"{_rupees(p.get('total', 0))}</td></tr></table>"
        f"{_pay_chip(p.get('payment_method', ''))}"
    )
    subject = f"Order confirmed: {p.get('order_number','')} — thanks, {name}!"
    return subject, _shell(
        "Your order is confirmed", body, f"{storefront_url}/order-tracking", "Track your order",
        preheader=f"Order {p.get('order_number','')} for {_rupees(p.get('total', 0))} is confirmed.",
        header_meta=f"ORDER {p.get('order_number','')}",
        pill=("ORDER CONFIRMED", GREEN),
    )


def payment_captured(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"We've received your payment of <b style='color:{INK};'>{_rupees(p.get('amount', 0))}</b> "
        f"for order <b style='color:{INK};'>{p.get('order_number','')}</b>. "
        "Your order is now being prepared and will ship soon."
    )
    subject = f"Payment received — order {p.get('order_number','')} is being prepared"
    return subject, _shell(
        "Payment successful", body, _order_link(storefront_url), "View order",
        preheader=f"We received {_rupees(p.get('amount', 0))} for {p.get('order_number','')}.",
        header_meta=f"ORDER {p.get('order_number','')}",
        pill=("PAYMENT RECEIVED", GREEN),
    )


def order_shipped(p: dict, storefront_url: str) -> tuple[str, str]:
    tracking = (
        f"<div style='margin:18px 0 0;background:{PAPER};border:1px solid {LINE};"
        f"border-radius:12px;padding:14px 18px;font-size:14px;color:{MUTED};'>"
        f"Tracking number: <b style='color:{INK};letter-spacing:0.5px;'>"
        f"{p.get('tracking_number','')}</b></div>"
        if p.get("tracking_number") else ""
    )
    link = p.get("tracking_url") or _order_link(storefront_url)
    body = (
        f"Good news — order <b style='color:{INK};'>{p.get('order_number','')}</b> has been "
        "dispatched and is on its way to you via Delhivery express." + tracking
    )
    return (
        f"Your order has shipped · {p.get('order_number','')}",
        _shell("Your order is on its way", body, link, "Track shipment",
               preheader=f"Order {p.get('order_number','')} has shipped.",
               header_meta=f"ORDER {p.get('order_number','')}",
               pill=("SHIPPED", AMBER)),
    )


def order_delivered(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Order <b style='color:{INK};'>{p.get('order_number','')}</b> has been delivered — "
        "we hope you love it. If anything isn't right, our support team is one tap away "
        "and the 7-day easy-return window starts today."
    )
    return (
        f"Delivered · {p.get('order_number','')}",
        _shell("Delivered. Enjoy!", body, f"{storefront_url}/shop", "Shop again",
               preheader=f"Order {p.get('order_number','')} was delivered.",
               header_meta=f"ORDER {p.get('order_number','')}",
               pill=("DELIVERED", GREEN)),
    )


def order_cancelled(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"Order <b style='color:{INK};'>{p.get('order_number','')}</b> has been cancelled. "
        "Any reserved stock has been released. If you paid online, your refund will be "
        "processed to the original payment method — no action is needed from you."
    )
    return (
        f"Order cancelled · {p.get('order_number','')}",
        _shell("Order cancelled", body, storefront_url, "Continue shopping",
               preheader=f"Order {p.get('order_number','')} was cancelled.",
               header_meta=f"ORDER {p.get('order_number','')}",
               pill=("CANCELLED", RED)),
    )


def order_refunded(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        f"A refund of <b style='color:{INK};'>{_rupees(p.get('refund_amount', 0))}</b> for order "
        f"<b style='color:{INK};'>{p.get('order_number','')}</b> has been initiated. It typically "
        "reaches your original payment method within <b style='color:#3f3f46;'>5–7 business days</b>, "
        "depending on your bank."
    )
    return (
        f"Refund initiated · {p.get('order_number','')}",
        _shell("Your refund is on the way", body, _order_link(storefront_url), "View order",
               preheader=f"{_rupees(p.get('refund_amount', 0))} refund for {p.get('order_number','')}.",
               header_meta=f"ORDER {p.get('order_number','')}",
               pill=("REFUND INITIATED", GREEN)),
    )


def cart_reminder(p: dict, storefront_url: str) -> tuple[str, str]:
    name = p.get("first_name") or "there"
    items = p.get("items", [])
    rows = "".join(
        f"<li style='margin:5px 0;color:{INK};'>{i.get('name','Item')} "
        f"<span style='color:{FAINT};'>— {_rupees(i.get('unit_price', 0))}</span></li>"
        for i in items[:5]
    )
    nudge = (
        "These are popular items — stock isn't guaranteed to wait for you."
        if p.get("stage") == "3d" else
        "Popular items can sell out — don't wait too long!"
    )
    body = (
        f"Hi {name}, you left something behind."
        f"<ul style='padding-left:20px;margin:16px 0;'>{rows}</ul>"
        f"<p style='color:{FAINT};font-size:13px;'>{nudge}</p>"
    )
    subject = ("Still thinking it over? Your cart is waiting" if p.get("stage") == "3d"
               else "You left items in your cart")
    return subject, _shell(
        "Your cart is waiting", body, f"{storefront_url}/cart", "Return to cart",
        preheader="Complete your purchase — your items are reserved for a short while.",
        pill=("CART REMINDER", AMBER),
    )


def password_reset(p: dict, storefront_url: str) -> tuple[str, str]:
    body = (
        "We received a request to reset the password for your ELEKTRIX account."
        "<br/><br/>This link is valid for <b style='color:#3f3f46;'>30 minutes</b> and "
        "can be used only once.<br/><br/>"
        f"<div style='background:#fffbeb;border:1px solid #fde68a;border-radius:12px;"
        f"padding:12px 16px;font-size:13px;color:{AMBER};margin-top:18px;'>"
        "Didn't request this? You can safely ignore this email — your password stays unchanged."
        "</div>"
    )
    link = f"{storefront_url}/reset-password?token={p.get('token','')}"
    return "Reset your ELEKTRIX password", _shell(
        "Password reset", body, link, "Reset password",
        preheader="A password reset was requested for your account. Link valid 30 minutes.",
        pill=("SECURITY", AMBER),
    )


def welcome(p: dict, storefront_url: str) -> tuple[str, str]:
    name = p.get("first_name") or "there"
    perks = "".join(
        f"<tr><td style='padding:7px 0;color:{MUTED};font-size:14px;'>"
        f"<span style='color:{GREEN};font-weight:700;'>&nbsp;✓&nbsp;</span>{t}</td></tr>"
        for t in (
            "Faster checkout with saved addresses",
            "Live order tracking from our Bihar warehouse",
            "Member-only coupons and festival offers",
        )
    )
    body = (
        f"Hi {name}, welcome to ELEKTRIX — India's premium electronics store. "
        "Your account is ready. Here's what you can do with it:"
        f"<table role='presentation' cellpadding='0' cellspacing='0' style='margin:14px 0 0;'>{perks}</table>"
    )
    return "Welcome to ELEKTRIX ⚡", _shell(
        "Welcome to ELEKTRIX!", body, f"{storefront_url}/shop", "Start shopping",
        preheader="Your account is ready — faster checkout, live tracking, member offers.",
        pill=("ACCOUNT READY", GREEN),
    )


def otp_login(p: dict, storefront_url: str) -> tuple[str, str]:
    code = p.get("code", "")
    if p.get("requested_phone"):
        intro = (
            f"We couldn't send an SMS to your number ending in {p.get('phone_last4') or '****'} "
            "right now, so your sign-in code is below — it works the same way."
            "<br/><br/>"
        )
    else:
        intro = ""
    body = (
        f"{intro}Use this one-time code to sign in to your ELEKTRIX account:"
        f"<div style='margin:24px auto 20px;max-width:320px;text-align:center;background:{PAPER};"
        f"border:1px solid {LINE};border-radius:14px;padding:20px 10px;'>"
        f"<div style='font-size:34px;letter-spacing:10px;font-weight:700;color:{INK};'>"
        f"{code}</div>"
        f"<div style='margin-top:8px;font-size:11px;color:{FAINT};letter-spacing:1px;'>"
        "EXPIRES IN 10 MINUTES</div></div>"
        "This code is single-use. "
        f"<span style='color:{FAINT};'>Never share it with anyone — the ELEKTRIX team "
        "will never ask for it.</span>"
    )
    return "Your ELEKTRIX sign-in code", _shell(
        "One-time sign-in code", body,
        preheader=f"Your ELEKTRIX sign-in code is {code}. It expires in 10 minutes.",
        pill=("VERIFICATION", GREEN),
    )


def low_stock_alert(p: dict, storefront_url: str) -> tuple[str, str]:
    """Internal staff digest — delivered to the admin@ alias by the worker."""
    items = p.get("items", [])
    rows = "".join(
        f"<tr>"
        f"<td style='padding:10px 4px;border-bottom:1px solid {LINE};color:{INK};font-size:14px;'>"
        f"{i.get('name','')}"
        + (f" <span style='color:{FAINT};font-size:12px;'>({i['sku']})</span>" if i.get("sku") else "")
        + "</td>"
        f"<td style='padding:10px 4px;border-bottom:1px solid {LINE};text-align:center;"
        f"font-weight:700;color:{RED};'>{i.get('available', 0)}</td>"
        f"<td style='padding:10px 4px;border-bottom:1px solid {LINE};text-align:center;"
        f"color:{FAINT};'>{i.get('threshold', 0)}</td>"
        "</tr>"
        for i in items[:20]
    )
    body = (
        f"<b style='color:{INK};'>{p.get('count', len(items))}</b> product(s) are at or below "
        "their low-stock threshold and need restocking:"
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' "
        f"style='margin:18px 0 8px;border:1px solid {LINE};border-radius:12px;border-collapse:separate;'>"
        "<tr style='background:#fafafa;'>"
        "<th style='padding:10px 4px;text-align:left;font-size:11px;color:#a1a1aa;"
        "letter-spacing:1.2px;text-transform:uppercase;'>Product</th>"
        "<th style='padding:10px 4px;text-align:center;font-size:11px;color:#a1a1aa;"
        "letter-spacing:1.2px;text-transform:uppercase;'>Available</th>"
        "<th style='padding:10px 4px;text-align:center;font-size:11px;color:#a1a1aa;"
        "letter-spacing:1.2px;text-transform:uppercase;'>Threshold</th>"
        f"</tr>{rows}</table>"
        "Restock soon so listings don't go dark."
    )
    return "Low stock alert: restock needed", _shell(
        "Low stock alert", body, f"{storefront_url}/shop", "View storefront",
        preheader=f"{p.get('count', len(items))} products need restocking.",
        pill=("INVENTORY", AMBER),
    )


def weekly_digest(p: dict, storefront_url: str) -> tuple[str, str]:
    """Internal staff digest — delivered to the admin@ alias by the worker."""
    def _rupees2(v):
        return f"₹{round(v / 100):,}"

    rows = [
        ("Orders placed", str(p.get("orders", 0))),
        ("Revenue (excl. pending/cancelled)", _rupees2(p.get("revenue", 0))),
        ("Cancelled orders", str(p.get("cancelled", 0))),
        ("New customers", str(p.get("new_customers", 0))),
        ("Failed payments", str(p.get("failed_payments", 0))),
        ("Abandoned-cart value", _rupees2(p.get("abandoned_value", 0))),
        ("Open support tickets", str(p.get("tickets", 0))),
        ("Low-stock products", str(p.get("low_stock", 0))),
    ]
    trs = "".join(
        f"<tr><td style='padding:10px 4px;border-bottom:1px solid {LINE};color:{MUTED};"
        f"font-size:14px;'>{k}</td>"
        f"<td style='padding:10px 4px;border-bottom:1px solid {LINE};text-align:right;"
        f"font-weight:700;color:{INK};font-size:14px;'>{v}</td></tr>"
        for k, v in rows
    )
    body = (
        "Here is how ELEKTRIX performed over the last 7 days:"
        f"<table role='presentation' width='100%' cellpadding='0' cellspacing='0' "
        f"style='margin:18px 0 8px;border:1px solid {LINE};border-radius:12px;border-collapse:separate;'>"
        f"{trs}</table>"
    )
    return "Your weekly ELEKTRIX recap", _shell(
        "Weekly business recap", body, f"{storefront_url}", "Open the storefront",
        preheader="Your store's week at a glance.",
        pill=("WEEKLY RECAP", GREEN),
    )


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
            "<div style='margin:24px auto 6px;max-width:340px;text-align:center;'>"
            "<div style='font-size:26px;letter-spacing:6px;font-weight:700;"
            f"color:{AMBER};text-align:center;padding:16px 10px;background:#fffbeb;"
            "border:2px dashed #f59e0b;border-radius:14px;'>"
            f"{coupon['code']}</div>"
            "<p style='margin:10px 0 0;text-align:center;color:#6b7280;font-size:13px;'>"
            f"{value}{min_order} — valid for a limited time.</p></div>"
        )
    body = (
        f"Hi {name},"
        f"<br/><br/>{p.get('message', '').replace(chr(10), '<br/>')}"
        f"{coupon_html}"
    )
    subject = p.get("subject") or "A little something from ELEKTRIX"
    return subject, _shell(
        subject, body, f"{storefront_url}/shop", "Shop now",
        preheader=(p.get("message", "") or subject)[:120],
        pill=("FROM ELEKTRIX", GREEN),
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
