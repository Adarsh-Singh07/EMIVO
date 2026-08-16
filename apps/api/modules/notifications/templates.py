"""Email templates for transactional notifications. Plain-PHP-style string
templates — no template engine dependency, easy to audit."""

BRAND = "ELEKTRIX"
PRIMARY = "#6d28d9"


def _shell(title: str, body_html: str, cta_url: str = "", cta_label: str = "") -> str:
    cta = (
        f'<div style="margin:28px 0"><a href="{cta_url}" style="background:{PRIMARY};color:#fff;'
        'padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">'
        f"{cta_label}</a></div>"
        if cta_url
        else ""
    )
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e4e4e7">
      <div style="font-size:20px;font-weight:800;color:{PRIMARY};letter-spacing:2px;margin-bottom:20px">ELEKTRIX</div>
      <h2 style="margin:0 0 16px;font-size:20px;color:#18181b">{title}</h2>
      <div style="font-size:14px;line-height:1.7;color:#3f3f46">{body_html}</div>
      {cta}
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa">
        ELEKTRIX · APANA ENTERPRISES · support@elektrix.in<br/>
        This is an automated message about your ELEKTRIX order.
      </div>
    </div>
  </div>
</body></html>"""


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


def order_created(p: dict, storefront_url: str) -> tuple[str, str]:
    name = p.get("first_name") or "there"
    total = _rupees(p.get("total", 0))
    pay = "Cash on Delivery" if p.get("payment_method") == "COD" else "Online Payment"
    body = (
        f"Hi {name}, thanks for your order!<br/><br/>"
        f"Your order <b>{p.get('order_number','')}</b> has been placed ({pay})."
        f"{_items_table(p.get('items', []))}"
        f"<div style='font-size:16px'><b>Total: {total}</b></div><br/>"
        "We'll notify you as your order progresses."
    )
    subject = f"Order confirmed · {p.get('order_number','')}"
    return subject, _shell("Order confirmed 🎉", body, f"{storefront_url}/account/orders", "Track order")


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
}
