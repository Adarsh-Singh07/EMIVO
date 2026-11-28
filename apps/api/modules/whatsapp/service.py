import json
import logging
import re
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.money import format_inr_paise
from core.redis import redis_manager
from modules.chatbot.service import ask_gemini
from modules.notifications.whatsapp import get_whatsapp_provider

logger = logging.getLogger(__name__)

QUICK_MENU = """Namaste from ELEKTRIX! ⚡
Your premier electronics marketplace.

How can I assist you today?
1️⃣ Track my order
2️⃣ Search products & check prices
3️⃣ 🔔 Notify me when an item is back in stock
4️⃣ Current offers & coupons
5️⃣ Open-Box Delivery & OTP details
6️⃣ Returns, Replacements & Support

Reply with a number (1-6) or type your question in English or Hindi!"""

OPEN_BOX_INFO = """📦 *ELEKTRIX Open-Box Delivery Policy* ⚡

To ensure complete trust and eliminate fraud, all ELEKTRIX deliveries are Open-Box:
1. *Inspect Before Acceptance:* You MUST open the package and physically inspect your item in front of the delivery executive.
2. *Delivery Verification OTP:* When your order is Out for Delivery, an OTP is generated. Share this OTP with the delivery executive ONLY after inspecting the item.
3. *Damaged / Wrong Items:* If the item is damaged or incorrect, reject the delivery or report same-day to support@elektrix.in with photos for an immediate free replacement.
4. *Warranty:* Internal manufacturing defects are covered under the brand's authorized service center warranty."""

OFFERS_FALLBACK = """🎟️ *ELEKTRIX Offers* ⚡

• *Free Pan-India Delivery* on all orders over ₹999!
• New coupon codes drop during festival sales — keep an eye here.
• Express dispatch directly from our central warehouse in Vijayipur, Bihar (841508)."""


async def _offers_reply(session) -> str:
    """Live active coupons from the database — the hardcoded WELCOME10/FLAT200
    copy drifted from the real coupons table (expired codes stayed listed)."""
    lines = []
    try:
        res = await session.execute(text("""
            SELECT code, discount_type, discount_value, min_order_amount, max_discount_amount
            FROM coupons
            WHERE is_active = TRUE
              AND (start_date IS NULL OR start_date <= now())
              AND (end_date IS NULL OR end_date >= now())
            ORDER BY created_at DESC LIMIT 5
        """))
        for r in res.mappings():
            if r["discount_type"] == "PERCENTAGE":
                offer = f"{r['discount_value']:g}% OFF"
                if r["max_discount_amount"]:
                    offer += f" (up to ₹{round(r['max_discount_amount'] / 100):,})"
            else:
                offer = f"₹{round(r['discount_value'] / 100):,} OFF"
            if r["min_order_amount"]:
                offer += f" on orders above ₹{round(r['min_order_amount'] / 100):,}"
            lines.append(f"• *{r['code']}*: {offer}")
    except Exception as e:
        logger.warning("WhatsApp offers query failed: %s", e)
    body = "\n".join(lines) if lines else ""
    return f"🎟️ *Active Offers on ELEKTRIX* ⚡\n\n{body}\n\n{OFFERS_FALLBACK}"


def clean_phone(phone_raw: str) -> str:
    cleaned = re.sub(r"[^\d]", "", str(phone_raw or ""))
    if len(cleaned) == 10:
        return f"91{cleaned}"
    if cleaned.startswith("0") and len(cleaned) == 11:
        return f"91{cleaned[1:]}"
    return cleaned


_STATUS_LABELS = {
    "PENDING": "Pending confirmation",
    "CONFIRMED": "Confirmed — being packed",
    "PROCESSING": "Processing",
    "PACKED": "Packed — awaiting pickup",
    "SHIPPED": "Shipped — on the way",
    "OUT_FOR_DELIVERY": "Out for delivery today",
    "DELIVERED": "Delivered",
    "RETURNED": "Returned",
    "CANCELLED": "Cancelled",
    "REFUNDED": "Refunded",
    "PAYMENT_FAILED": "Payment failed",
}


def humanize_status(status: str) -> str:
    """Order enum -> customer-friendly words ('OUT_FOR_DELIVERY' -> 'Out for
    delivery today'); unknown values pass through with nicer casing."""
    if not status:
        return "In progress"
    return _STATUS_LABELS.get(status.upper(), status.replace("_", " ").title())


def format_for_whatsapp(text_in: str) -> str:
    """Convert model markdown into clean WhatsApp markup.

    WhatsApp understands *bold*, _italic_, ~strike~ and ```mono``` — not
    **bold**, __bold__, ### headings, - bullets, ~~strike~~ or fenced code
    blocks. Gemini emits those constantly, so every construct is mapped to
    its WhatsApp equivalent (or dropped) instead of leaking raw markdown:

    - **bold** / __bold__        -> *bold*
    - ### heading                -> *heading* on its own line
    - - / * list items           -> bullet dots
    - [label](url)               -> *label*: url (tap-friendly)
    - ~~strike~~                 -> ~strike~
    - ``` fences, HTML tags, --- rules -> removed
    """
    out = text_in

    # fenced code blocks: keep the content, drop the fences
    out = re.sub(r"```[a-zA-Z0-9]*\n?", "", out)

    # headings (###, ##, #) -> bold lines
    out = re.sub(r"^#{1,6}\s+(.+)$", r"*\1*", out, flags=re.MULTILINE)

    # bold (asterisk and underscore forms)
    out = re.sub(r"\*\*([^*]+)\*\*", r"*\1*", out)
    out = re.sub(r"__([^_]+)__", r"*\1*", out)

    # strikethrough
    out = re.sub(r"~~([^~]+)~~", r"~\1~", out)

    # markdown links -> WhatsApp bold label + bare URL
    out = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)", r"*\1*: \2", out)

    # dash/asterisk bullets -> bullet dots (anchored at line start so
    # "*bold*" markers mid-sentence are never touched)
    out = re.sub(r"^\s*[-*]\s+", "\u2022 ", out, flags=re.MULTILINE)

    # horizontal rules -> nothing (a blank line reads better on mobile)
    out = re.sub(r"^\s*[-*_]{3,}\s*$", "", out, flags=re.MULTILINE)

    # strip any residual HTML
    out = re.sub(r"<[^>]+>", "", out)

    # collapse runaway blank lines (WhatsApp renders them as big gaps)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


class WhatsAppService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.provider = get_whatsapp_provider()

    async def handle_inbound_message(self, sender_raw: str, message_text: str) -> Optional[str]:
        """Core router for inbound WhatsApp messages from MSG91 webhook."""
        if not sender_raw or not message_text:
            return None

        phone_norm = clean_phone(sender_raw)
        p10 = phone_norm[-10:] if len(phone_norm) >= 10 else phone_norm
        msg_clean = message_text.strip()
        msg_lower = msg_clean.lower()

        logger.info("Processing inbound WhatsApp message from %s: %s", phone_norm, msg_clean[:80])

        # 1. Lookup user in DB by phone
        user_row = (await self.session.execute(
            text("""
                SELECT id, first_name, last_name, email, phone 
                FROM users 
                WHERE (phone = :p10 OR phone = :p12 OR phone = :pplus) 
                  AND deleted_at IS NULL 
                LIMIT 1
            """),
            {"p10": p10, "p12": f"91{p10}", "pplus": f"+91{p10}"},
        )).mappings().first()

        user_id = str(user_row["id"]) if user_row else None
        user_name = (user_row["first_name"] if user_row else None) or "there"

        # 2. Quick Command Shortcut Matching (1-6 & Greetings)
        reply = None

        if msg_lower in ("hi", "hello", "hey", "menu", "help", "namaste", "start"):
            name_greet = f"Hi {user_name}!" if user_row else "Namaste!"
            reply = f"{name_greet} 👋\n\n{QUICK_MENU}"

        elif msg_clean in ("1", "1.") or msg_lower in ("track", "track order", "my order", "where is my order"):
            reply = await self._handle_order_tracking(user_id, phone_norm)

        elif msg_clean in ("2", "2.") or msg_lower in ("search", "products", "catalog", "shop"):
            reply = (
                "🔍 Browse our catalog across Mobiles, Laptops, Audio, Wearables & Appliances at:\n"
                "👉 https://elektrix.in/shop\n\n"
                "Or tell me what you're looking for (e.g. *'Suggest earbuds under 2000'*), and I'll find top matches for you!"
            )

        elif msg_clean in ("3", "3.") or "back in stock" in msg_lower or "notify me" in msg_lower:
            reply = await self._handle_stock_alert_prompt(msg_clean, phone_norm, user_id)

        elif msg_clean in ("4", "4.") or msg_lower in ("offers", "coupon", "coupons", "discount"):
            reply = await _offers_reply(self.session)

        elif msg_clean in ("5", "5.") or "open box" in msg_lower or "otp" in msg_lower:
            reply = OPEN_BOX_INFO

        elif msg_clean in ("6", "6.") or msg_lower in ("support", "complaint", "return", "refund"):
            reply = (
                "🛠️ *ELEKTRIX Returns & Support* ⚡\n\n"
                "• *7-Day Easy Return:* Reply with `return ELK-XXXXXX damaged` (or `defective` / `wrong` / `not as described`) to start a return.\n"
                "• *Phone Support:* +91 80920 24066 (9 AM - 8 PM IST)\n"
                "• *Email:* support@elektrix.in\n\n"
                "If you have an issue with a specific order, reply with the order number and describe what happened — I can raise a ticket or return request right away."
            )

        elif re.match(r"^return\s+ELK-[A-Za-z0-9-]+", msg_clean, re.IGNORECASE):
            m_ret = re.match(r"^return\s+(ELK-[A-Za-z0-9-]+)(?:\s+(.*))?$", msg_clean, re.IGNORECASE)
            reply = await self._handle_return_intent(
                user_id,
                m_ret.group(1).upper() if m_ret else "",
                (m_ret.group(2) or "").strip() if m_ret else "",
            )

        # 3. Conversational Fallback -> Gemini / Agnes AI
        if reply is None:
            reply = await self._handle_ai_chat(user_id, user_name, phone_norm, msg_clean)

        # 4. Deliver response via MSG91 Session API (24h free service window)
        formatted_reply = format_for_whatsapp(reply)
        if self.provider:
            success = await self.provider.send_session_message(phone_norm, formatted_reply)
            logger.info("Sent WhatsApp reply to %s (success=%s)", phone_norm, success)
        else:
            logger.warning("WhatsApp provider unconfigured; reply logged: %s", formatted_reply[:100])

        return formatted_reply

    async def _handle_order_tracking(self, user_id: Optional[str], phone: str) -> str:
        """Looks up the user's latest orders and provides status & delivery OTP."""
        if not user_id:
            return (
                "📦 To track your order, please reply with your Order Number (e.g. *ELK-260913-FC6D6B*), "
                "or ensure your WhatsApp number matches your registered ELEKTRIX mobile number."
            )

        res = (await self.session.execute(
            text("""
                SELECT o.order_number, o.status, o.total, o.tracking_number, o.tracking_url,
                       COALESCE(o.delivery_otp, '') AS delivery_otp,
                       COALESCE((SELECT string_agg(oi.product_name, ', ')
                                 FROM order_items oi WHERE oi.order_id = o.id), 'Items') AS items
                FROM orders o
                WHERE o.user_id = :uid AND o.deleted_at IS NULL
                ORDER BY o.created_at DESC LIMIT 3
            """),
            {"uid": user_id},
        )).mappings().all()

        if not res:
            return "📦 You don't have any recent orders on ELEKTRIX yet. Start shopping at https://elektrix.in/shop !"

        lines = ["📦 *Your Recent Orders on ELEKTRIX:*"]
        for o in res:
            num = o["order_number"]
            st = humanize_status(o["status"])
            items = o["items"]
            amt = format_inr_paise(o["total"])
            track_awb = f"AWB: {o['tracking_number']}" if o.get("tracking_number") else ""

            otp_alert = ""
            if st == "OUT_FOR_DELIVERY":
                otp_alert = (
                    f"\n   🔒 *Open-Box Delivery Verification OTP: {o['delivery_otp']}*\n"
                    f"   ⚠️ *Strict Policy:* Open and inspect your package with the delivery agent before sharing this OTP."
                )

            lines.append(f"\n• *{num}* ({amt})\n   Items: {items}\n   Status: *{st}* {track_awb}{otp_alert}")

        lines.append("\nTrack live delivery progress at https://elektrix.in/order-tracking")
        return "\n".join(lines)

    async def _handle_return_intent(
        self, user_id: Optional[str], order_number: str, details: str
    ) -> str:
        """Handle `return ELK-xxxxxx [reason]` WhatsApp requests."""
        if not user_id:
            return (
                "To request a return on WhatsApp, please message from your registered ELEKTRIX mobile number "
                "or contact support@elektrix.in with your order number."
            )

        from core.store import get_store_business_id
        from modules.returns.models import ReturnReason
        from modules.returns.schemas import ReturnRequestCreate
        from modules.returns.service import ReturnService

        bid = await get_store_business_id(self.session)
        await self.session.execute(text("SELECT set_config('app.business_id', :bid, true)"), {"bid": str(bid)})
        await self.session.execute(text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user_id)})

        order_row = (
            await self.session.execute(
                text(
                    "SELECT id, order_number, status::text AS status, delivered_at "
                    "FROM orders WHERE order_number ILIKE :num AND user_id = :uid AND deleted_at IS NULL LIMIT 1"
                ),
                {"num": order_number, "uid": str(user_id)},
            )
        ).mappings().first()
        if not order_row:
            return f"We couldn't find order *{order_number}* under your account."

        items = (
            await self.session.execute(
                text("SELECT id, product_name, quantity FROM order_items WHERE order_id = :oid"),
                {"oid": str(order_row["id"])},
            )
        ).mappings().all()
        if not items:
            return f"No items found on order *{order_row['order_number']}*."

        det_low = details.lower()
        reason: Optional[ReturnReason] = None
        if "damag" in det_low or "broken" in det_low:
            reason = ReturnReason.DAMAGED
        elif "defect" in det_low or "fault" in det_low or "not work" in det_low or "dead" in det_low:
            reason = ReturnReason.DEFECTIVE
        elif "wrong" in det_low or "incorrect" in det_low:
            reason = ReturnReason.WRONG_ITEM
        elif "described" in det_low or "different" in det_low or "mismatch" in det_low:
            reason = ReturnReason.NOT_AS_DESCRIBED

        if reason is None or len(items) > 1:
            item_lines = "\n".join(
                f"• {it['product_name']} (qty {it['quantity']})" for it in items
            )
            if len(items) > 1 and reason is not None:
                # For multi-item orders via WhatsApp, create a return for the first
                # matching product name if mentioned, else list the items.
                matched = next(
                    (it for it in items if it["product_name"].lower().split()[0] in det_low),
                    None,
                )
                if not matched:
                    return (
                        f"Order *{order_row['order_number']}* has multiple items:\n{item_lines}\n\n"
                        f"Reply with the product name + reason, e.g. `return {order_row['order_number']} {items[0]['product_name'].split()[0]} damaged`."
                    )
                target_item = matched
            elif reason is None:
                return (
                    f"To start a return for *{order_row['order_number']}*, reply with one of these reasons:\n"
                    f"• `return {order_row['order_number']} damaged`\n"
                    f"• `return {order_row['order_number']} defective`\n"
                    f"• `return {order_row['order_number']} wrong`\n"
                    f"• `return {order_row['order_number']} not as described`"
                )
            else:
                target_item = items[0]
        else:
            target_item = items[0]

        try:
            rr = await ReturnService(self.session).create_return_request(
                str(order_row["id"]),
                ReturnRequestCreate(
                    order_item_id=str(target_item["id"]),
                    qty=int(target_item["quantity"]),
                    reason=reason,
                    customer_note=details[:500] or None,
                ),
                actor_user_id=str(user_id),
                is_staff=False,
            )
            return (
                f"✅ *Return Request Submitted*\n\n"
                f"• Return ID: *{rr.return_number}*\n"
                f"• Order: *{rr.order_number}*\n"
                f"• Item: {rr.product_name} × {rr.qty}\n"
                f"• Refund estimate: *{format_inr_paise(rr.refund_amount)}*\n\n"
                "Our team will review this within 24–48 hours and send pickup details by email."
            )
        except Exception as exc:
            msg = getattr(exc, "message", str(exc))
            return f"⚠️ Could not start return for *{order_row['order_number']}*: {msg}"

    async def _handle_stock_alert_prompt(self, msg: str, phone: str, user_id: Optional[str]) -> str:
        """Handles explicit back-in-stock intent or guides customer."""
        from modules.stock_alerts.service import StockAlertService

        # Try to detect product match from catalog
        match_prod = (await self.session.execute(
            text("""
                SELECT id, name, slug 
                FROM products 
                WHERE status = 'ACTIVE' 
                  AND (to_tsvector('english', name) @@ plainto_tsquery('english', :q) 
                       OR name ILIKE :like_q)
                ORDER BY created_at DESC LIMIT 1
            """),
            {"q": msg, "like_q": f"%{msg}%"},
        )).mappings().first()

        if match_prod:
            try:
                await StockAlertService(self.session).subscribe(
                    product_id=str(match_prod["id"]),
                    phone=phone,
                    user_id=user_id,
                )
                return (
                    f"🔔 *Done!* You're subscribed for *{match_prod['name']}*.\n\n"
                    f"We will message you on WhatsApp as soon as stock arrives at our central warehouse! ⚡"
                )
            except Exception as e:
                logger.warning("Error subscribing alert: %s", e)

        return (
            "🔔 *Back-in-Stock Alerts* ⚡\n\n"
            "Tell me the exact product name you'd like an alert for (e.g. *'Notify me when 48V Lithium Battery is back'*), "
            "or visit the product page on https://elektrix.in and tap *'Notify Me on WhatsApp'*!"
        )

    async def _handle_ai_chat(self, user_id: Optional[str], user_name: str, phone: str, message: str) -> str:
        """Invokes ask_gemini with Redis multi-turn history."""
        # 1. Fetch chat history from Redis
        history: List[Dict[str, str]] = []
        redis_key = f"wa:chat:{phone}"
        redis_client = getattr(redis_manager, "client", None)
        if redis_client:
            try:
                raw_hist = await redis_client.get(redis_key)
                if raw_hist:
                    history = json.loads(raw_hist)
            except Exception as e:
                logger.warning("Redis history read failed: %s", e)

        # 2. Call ask_gemini
        reply, ticket_action, cancel_number, notify_action = await ask_gemini(
            session=self.session,
            user_id=user_id,
            user_name=user_name,
            message=message,
            history=history,
        )

        # 3. Handle actions
        if not reply:
            reply = (
                "Sorry, I couldn't process that just now. Please try again, or reach "
                "our team at support@elektrix.in / +91 80920 24066 (9 AM – 8 PM IST)."
            )
        if cancel_number and user_id:
            from modules.orders.service import OrderService
            try:
                user_mock = type("UserMock", (), {"id": user_id, "first_name": user_name})()
                order = await OrderService(self.session).cancel_order_by_number(
                    cancel_number, user_mock, reason="cancelled via WhatsApp assistant"
                )
                reply += (
                    f"\n\n✅ Done — Order {order.order_number} is cancelled and any reserved stock has been released."
                )
            except Exception as e:
                reply += f"\n\n⚠️ Could not cancel order {cancel_number}: {getattr(e, 'message', str(e))}"

        if notify_action and notify_action.get("product_id"):
            from modules.stock_alerts.service import StockAlertService
            try:
                await StockAlertService(self.session).subscribe(
                    product_id=notify_action["product_id"],
                    phone=phone,
                    user_id=user_id,
                )
                reply += f"\n\n🔔 *Notification Set:* We'll WhatsApp you as soon as this item is restocked!"
            except Exception as e:
                logger.warning("WhatsApp stock alert error: %s", e)

        if ticket_action:
            from modules.support.service import SupportService
            try:
                if user_id:
                    svc = SupportService(self.session)
                    t = await svc.create_ticket(
                        user_id=user_id,
                        category=ticket_action.get("category", "support"),
                        subject=ticket_action.get("subject", "WhatsApp Inquiry"),
                        description=ticket_action.get("description", message),
                    )
                    reply += f"\n\n🎫 *Ticket Created:* Ref #{t.ticket_number}. Our support team will follow up promptly."
            except Exception as e:
                logger.warning("WhatsApp ticket creation error: %s", e)

        # 4. Save exchange in Redis (24 hour TTL)
        if redis_client:
            try:
                history.append({"role": "user", "text": message})
                history.append({"role": "model", "text": reply})
                history = history[-10:]  # Keep last 10 messages
                await redis_client.set(redis_key, json.dumps(history), ex=86400)
            except Exception as e:
                logger.warning("Redis history write failed: %s", e)

        return reply
