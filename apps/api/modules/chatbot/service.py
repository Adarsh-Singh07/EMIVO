"""ELEKTRIX AI Support & Shopping Assistant (Gemini / Agnes AI).

Supports both:
1. Logged-in Customers: Scoped to their OWN orders/payments, order cancellation, and authenticated tickets.
2. Store Visitors (Guests): Answers general ELEKTRIX questions (EV components, warranty, shipping from Bihar warehouse 841508, offers), product comparisons with full links, guest complaint logging (collecting name/email/phone), and strict privacy guard requiring login/OTP for order lookups.
"""
import logging
import re
from typing import Optional

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings

logger = logging.getLogger(__name__)

USER_SYSTEM_PROMPT = """You are ELEKTRIX's support & shopping assistant talking to {name}.
You may help with THEIR orders/payments (data below) and recommend products from the catalog.

RULES:
1. Never invent order numbers, amounts, statuses, or products. Only use the data given.
2. Short, friendly, plain-text replies (2-5 sentences).
3. When listing the customer's orders, lead with the PRODUCT NAME(S) and key details,
   then the order id and date. Example: "Your 48V 30Ah Lithium Battery Pack (₹24,999, ELK-260913-FC6D6B,
   placed 14 Sep 2:41 am) is currently confirmed and in packing."
4. Payment flow: unpaid orders can be retried for 2h from My Orders ("Complete Payment");
   failed payments retry the same way; after the window, reorder.
5. Shipping: All orders ship from our central warehouse in Vijayipur, Gopalganj, Bihar (PIN: 841508)
   via Delhivery express courier. Typical delivery is 2–5 days depending on location.
6. PRODUCT SUGGESTIONS: when the customer asks for recommendations, pick from the catalog
   list and ALWAYS give the full link https://elektrix.in/product/<slug> for each.
   COMPARISONS: compare only products present in the catalog list, on price and features.
7. CANCELLATION: if the customer wants to cancel an order, show the order's details
   (product, amount, order number) and ask them to confirm. ONLY when their latest
   message clearly confirms (yes / confirm / cancel it), output on the LAST line:
   CANCEL_ORDER: <order_number>
   If they ask to cancel multiple/unclear orders, ask which one. Never emit CANCEL_ORDER
   without a prior explicit confirmation from the customer.
8. TICKETS — TWO-STEP ONLY:
   Step 1: when the customer wants to complain / report an issue / reach a human, do NOT
   raise anything yet. Ask for the missing details (what happened, which order, expected
   outcome) and confirm with a summary: "Shall I raise ticket '<summary>'?" If they already
   have an OPEN ticket for the same issue (THEIR OPEN TICKETS below), do NOT raise another —
   refer them to that ticket number.
   Step 2: ONLY when the customer explicitly confirms (yes / raise it / confirm), output on
   the LAST line: RAISE_TICKET: <one-line summary>

CUSTOMER'S RECENT ORDERS (newest first):
{orders}

CATALOG (for suggestions/comparisons — name | price | link):
{catalog}

THEIR OPEN TICKETS:
{tickets}

CONVERSATION SO FAR:
{history}
"""

GUEST_SYSTEM_PROMPT = """You are ELEKTRIX's official support and shopping assistant talking to a store visitor (guest).

STORE & PRODUCT KNOWLEDGE:
- Brand: ELEKTRIX — India's premium electronics store (https://elektrix.in).
- What we sell: Mobiles, Laptops, Audio (headphones, earbuds, speakers), Home Appliances, and Wearables (smartwatches) from leading brands.
- Warehouse / Dispatch Origin: Vijayipur, Gopalganj, Bihar (Pincode: 841508).
- Shipping & Courier: Pan-India express delivery through Delhivery. Typical transit: 1-2 days in Bihar, 2-4 days in UP/WB/Jharkhand, 3-5 days in Delhi/Maharashtra/Gujarat/Rajasthan and most of North/Central/West India, 4-6 days in South India, 5-7 days in the North-East.
- Free Delivery: on all orders over ₹999.
- Returns: 7-day easy returns/replacement on eligible items — details at https://elektrix.in/refund.
- Warranty: varies by product — always point the customer to the product page for exact warranty terms.
- Active coupons: WELCOME10 gives 10% off (capped at ₹500) on orders above ₹2,000. FLAT200 gives ₹200 off on orders above ₹3,000.
- Customer Support: Phone: +91 80920 24066 | Email: support@elektrix.in | Hours: 9 AM - 8 PM IST.

PRIVACY & SECURITY RULES (STRICT):
1. The visitor is NOT currently logged in.
2. NEVER disclose, guess, or invent any customer's personal information, address, phone, or order status.
3. If the visitor asks to track an order (e.g. "where is my order", "status of ELK-12345") or view account details:
   Politely reply that for security and privacy, order/account details require verification — they can log in to their account, or share their registered email or mobile number so an OTP can be sent to verify their identity.

PRODUCT SUGGESTIONS & COMPARISONS:
- Recommend suitable products ONLY from the CATALOG list below.
- ALWAYS provide the full clickable markdown link [Product Name](https://elektrix.in/product/<slug>) for any product mentioned.
- When comparing products, compare on price and the features given in the catalog. If the catalog is unavailable, say so honestly and point the visitor to https://elektrix.in/shop.

GUEST COMPLAINTS & ISSUE REGISTRATION:
- If a guest wants to complain, report an issue, or speak to support:
  Ask for their:
  1. Full Name
  2. Email Address
  3. 10-digit Mobile Number
  4. Details of the complaint or issue
- Once the user has provided their Name, Email, Mobile number, and issue details:
  Confirm politely that you are logging their complaint, and on the VERY LAST LINE of your response output:
  GUEST_TICKET: name=<name> | email=<email> | phone=<phone> | subject=<summary> | description=<details>

CATALOG (for suggestions & comparisons):
{catalog}

CONVERSATION SO FAR:
{history}
"""


DEFAULT_CATALOG_FALLBACK = (
    "- (Live catalog is temporarily unavailable. Do NOT invent or link specific products; "
    "instead point the visitor to https://elektrix.in/shop to browse the full range.)"
)


async def get_public_catalog_block(session: Optional[AsyncSession]) -> str:
    if not session:
        return DEFAULT_CATALOG_FALLBACK
    try:
        from core.store import get_store_business_id
        bid = await get_store_business_id(session)
        await session.execute(text("SELECT set_config('app.business_id', :bid, true)"), {"bid": str(bid)})
        cat_res = await session.execute(text("""
            SELECT p.name, p.price, p.slug,
                   COALESCE(left(p.description, 90), '') AS blurb
            FROM products p
            WHERE p.business_id = :bid AND p.status = 'ACTIVE'
            ORDER BY p.created_at DESC LIMIT 20
        """), {"bid": str(bid)})
        cat_lines = [
            f"- {r['name']} | Rs {r['price'] / 100:.0f} | https://elektrix.in/product/{r['slug']} | {r['blurb'][:70]}"
            for r in cat_res.mappings()
        ]
        return "\n".join(cat_lines) or DEFAULT_CATALOG_FALLBACK
    except Exception as exc:
        logger.warning("Could not fetch catalog from DB: %s", exc)
        return DEFAULT_CATALOG_FALLBACK


async def build_user_context(session: AsyncSession, user_id: str, user_name: str) -> tuple[str, str, str, str]:
    """Returns (orders_block, catalog_block, tickets_block, user_name)."""
    from core.store import get_store_business_id
    bid = await get_store_business_id(session)
    await session.execute(text("SELECT set_config('app.business_id', :bid, true)"), {"bid": str(bid)})
    await session.execute(text("SELECT set_config('app.user_id', :uid, true)"), {"uid": user_id})

    orders_res = await session.execute(text("""
        SELECT o.order_number, o.status, o.payment_method, o.total, o.created_at,
               COALESCE(p.pay_status, '') AS pay_status,
               COALESCE((SELECT string_agg(oi.product_name || ' x' || oi.quantity, ', ')
                         FROM order_items oi WHERE oi.order_id = o.id), 'items n/a') AS items
        FROM orders o
        LEFT JOIN LATERAL (
            SELECT status::text AS pay_status
            FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
        ) p ON true
        WHERE o.user_id = :uid AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC LIMIT 5
    """), {"uid": user_id})
    order_lines = []
    for r in orders_res.mappings():
        order_lines.append(
            f"- Items: {r['items']} | Rs {r['total'] / 100:.0f} | Order {r['order_number']} "
            f"| placed {r['created_at']:%d %b %Y, %I:%M %p} | status {r['status']} "
            f"| payment: {r['pay_status'] or 'n/a'} ({r['payment_method']})"
        )
    orders_block = "\n".join(order_lines) or "- No orders yet."

    catalog_block = await get_public_catalog_block(session)

    await session.execute(text("SELECT set_config('app.user_id', :uid, true)"), {"uid": user_id})
    tk = await session.execute(text(
        "SELECT ticket_number, subject, status FROM support_tickets "
        "WHERE status IN ('open','in_progress') ORDER BY updated_at DESC LIMIT 5"
    ))
    tickets_block = "\n".join(
        f"- {r['ticket_number']} | {r['subject']} | {r['status']}" for r in tk.mappings()
    ) or "- None open."

    return orders_block, catalog_block, tickets_block, user_name


async def ask_gemini(
    session: AsyncSession,
    user_id: Optional[str],
    user_name: str,
    message: str,
    history: list[dict] | None = None
) -> tuple[str, Optional[dict], Optional[str]]:
    """Returns (reply, ticket_action|None, cancel_order_number|None)."""
    hist = ""
    for h in (history or [])[-8:]:
        who = "CUSTOMER" if h.get("role") == "user" else "YOU"
        hist += f"{who}: {h.get('text', '')}\n"

    if user_id:
        orders_block, catalog_block, tickets_block, _ = await build_user_context(session, user_id, user_name)
        prompt = USER_SYSTEM_PROMPT.format(
            name=user_name or "there",
            orders=orders_block,
            catalog=catalog_block,
            tickets=tickets_block,
            history=hist or "(new conversation)",
        )
    else:
        catalog_block = await get_public_catalog_block(session)
        prompt = GUEST_SYSTEM_PROMPT.format(
            catalog=catalog_block,
            history=hist or "(new conversation)",
        )

    prompt += f"\nCUSTOMER'S LATEST MESSAGE:\n{message}"

    reply, last_err = None, None

    # Primary: Agnes AI (OpenAI-compatible)
    agnes_key = settings.agnes_api_key.get_secret_value()
    if agnes_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.agnes_base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {agnes_key}"},
                    json={
                        "model": settings.agnes_chat_model,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                text_out = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
                reply = (text_out or "").strip()
                if not reply:
                    raise ValueError("empty completion from Agnes AI")
        except Exception as exc:
            logger.warning("chatbot Agnes AI (%s) failed: %s", settings.agnes_chat_model, str(exc)[:150])
            last_err = exc
            reply = None

    # Fallback: Google Gemini API
    if reply is None and settings.gemini_api_key.get_secret_value():
        try:
            from google import genai
            client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
            for model in [m.strip() for m in settings.gemini_chat_models.split(",") if m.strip()]:
                try:
                    resp = client.models.generate_content(model=model, contents=prompt)
                    reply = (resp.text or "").strip()
                    break
                except Exception as exc:
                    logger.warning("chatbot model %s failed: %s", model, str(exc)[:150])
                    last_err = exc
        except Exception as exc:
            logger.warning("Gemini Client initialization failed: %s", str(exc)[:150])
            last_err = exc

    # Intelligent local offline fallback if no API keys are configured (for local dev/tests)
    if reply is None:
        msg_lower = message.lower()
        if "compare" in msg_lower or "vs" in msg_lower:
            reply = (
                "I'd love to help you compare products! Our full range of mobiles, laptops, audio, "
                "appliances and wearables is at https://elektrix.in/shop — open any two products and "
                "compare their specs side by side on the product page. For detailed comparisons, our "
                "AI advisor is available shortly."
            )
        elif "shipping" in msg_lower or "delivery" in msg_lower or "warehouse" in msg_lower:
            reply = (
                "All ELEKTRIX orders are dispatched from our central warehouse in **Vijayipur, Gopalganj, Bihar (PIN: 841508)** via Delhivery express courier. "
                "Delivery takes 1–2 days in Bihar, 2–4 days in North/Central/Eastern India, and 4–6 days in South India. Free delivery is available on orders over ₹999!"
            )
        elif "offer" in msg_lower or "coupon" in msg_lower or "discount" in msg_lower:
            reply = (
                "Current offers: coupon **WELCOME10** gives 10% off (up to ₹500) on orders above ₹2,000, and **FLAT200** gives ₹200 off on orders above ₹3,000. "
                "Free delivery is available on orders over ₹999!"
            )
        elif "order" in msg_lower or "track" in msg_lower:
            if user_id:
                reply = "You can track your orders anytime from your My Orders page or ask me about a specific order number!"
            else:
                reply = "For your security and privacy, checking order details requires verification. Please log in to your account, or provide your registered email or mobile number so I can send an OTP to verify your identity."
        elif "complaint" in msg_lower or "issue" in msg_lower or "problem" in msg_lower:
            reply = (
                "I'm sorry to hear that! Please provide your **Full Name**, **Email address**, **10-digit Mobile number**, "
                "and a brief description of the issue so I can log a formal support ticket for our team right away."
            )
        else:
            reply = (
                "Welcome to ELEKTRIX — India's premium electronics store! I can help you with our mobiles, laptops, audio, "
                "appliances and wearables, current offers, or shipping estimates from our Bihar warehouse (841508). How can I help you today?"
            )

    ticket_action = None
    cancel_number = None

    # Check for GUEST_TICKET: output
    guest_m = re.search(r"GUEST_TICKET:\s*(.+)", reply, re.IGNORECASE)
    if guest_m:
        raw_gt = guest_m.group(1).strip()
        reply = reply[: guest_m.start()].strip()
        parts = {}
        for item in raw_gt.split("|"):
            if "=" in item:
                k, v = item.split("=", 1)
                parts[k.strip().lower()] = v.strip()
        ticket_action = {
            "is_guest": True,
            "name": parts.get("name", user_name or "Guest"),
            "email": parts.get("email", ""),
            "phone": parts.get("phone", ""),
            "subject": parts.get("subject", "Guest Support Request")[:200],
            "description": parts.get("description", message)[:3000],
            "category": "support"
        }

    # Check for RAISE_TICKET: output (logged-in user)
    m = re.search(r"RAISE_TICKET:\s*(.+)", reply)
    if m:
        reply = reply[: m.start()].strip()
        category = "payment" if re.search(r"payment|pay|refund|charged|txn", message, re.I) else (
            "order" if re.search(r"order|deliver|ship", message, re.I) else "other")
        ticket_action = {
            "is_guest": False,
            "category": category,
            "subject": m.group(1).strip()[:200],
            "description": message.strip()[:3000]
        }

    # Check for CANCEL_ORDER: output (logged-in user only)
    c = re.search(r"CANCEL_ORDER:\s*(ELK-[A-Za-z0-9-]+)", reply)
    if c and user_id:
        cancel_number = c.group(1)
        reply = reply[: c.start()].strip()

    return reply, ticket_action, cancel_number
