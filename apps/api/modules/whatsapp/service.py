import json
import logging
import re
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
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

OFFERS_INFO = """🎟️ *Active Offers on ELEKTRIX* ⚡

• *WELCOME10*: 10% OFF (up to ₹500) on orders above ₹2,000
• *FLAT200*: ₹200 OFF on orders above ₹3,000
• *Free Pan-India Delivery* on all orders over ₹999!
• Express dispatch directly from our central warehouse in Vijayipur, Bihar (841508) via Delhivery express."""


def clean_phone(phone_raw: str) -> str:
    cleaned = re.sub(r"[^\d]", "", str(phone_raw or ""))
    if len(cleaned) == 10:
        return f"91{cleaned}"
    if cleaned.startswith("0") and len(cleaned) == 11:
        return f"91{cleaned[1:]}"
    return cleaned


def format_for_whatsapp(text_in: str) -> str:
    """Format markdown text to WhatsApp formatting:
    - **bold** -> *bold*
    - [label](url) -> label: url
    - Strip HTML tags
    """
    out = re.sub(r"\*\*([^*]+)\*\*", r"*\1*", text_in)
    out = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)", r"*\1* (\2)", out)
    out = re.sub(r"<[^>]+>", "", out)
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
            reply = OFFERS_INFO

        elif msg_clean in ("5", "5.") or "open box" in msg_lower or "otp" in msg_lower:
            reply = OPEN_BOX_INFO

        elif msg_clean in ("6", "6.") or msg_lower in ("support", "complaint", "return", "refund"):
            reply = (
                "🛠️ *ELEKTRIX Customer Support* ⚡\n\n"
                "• *Open-Box Return/Replacement:* Report damage/wrong delivery on the same day with photos to support@elektrix.in.\n"
                "• *Phone Support:* +91 80920 24066 (9 AM - 8 PM IST)\n"
                "• *Email:* support@elektrix.in\n\n"
                "If you have an issue with a specific order, reply with the order number and describe what happened — I can raise a ticket for our team right now."
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
            st = o["status"]
            items = o["items"]
            amt = f"₹{round(o['total'] / 100):,}"
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
