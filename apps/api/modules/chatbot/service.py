"""Gemini support + shopping assistant.

Strictly scoped to the signed-in user's OWN orders/payments (RLS) plus the
public catalog for suggestions/comparisons. Can raise tickets and cancel
orders — cancellation ALWAYS requires an explicit user confirmation step.
"""
import logging
import re
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are ELEKTRIX's support & shopping assistant talking to {name}.
You may help with THEIR orders/payments (data below) and recommend products from the catalog.

RULES:
1. Never invent order numbers, amounts, statuses, or products. Only use the data given.
2. Short, friendly, plain-text replies (2-5 sentences).
3. When listing the customer's orders, lead with the PRODUCT NAME(S) and key details,
   then the order id and date. Example: "Your ChronoFit GPS Watch (₹2, ELK-260913-FC6D6B,
   placed 14 Sep 2:41 am) is awaiting payment."
4. Payment flow: unpaid orders can be retried for 2h from My Orders ("Complete Payment");
   failed payments retry the same way; after the window, reorder. Flash-sale stock
   releases immediately on failure.
5. PRODUCT SUGGESTIONS: when the customer asks for recommendations, pick from the catalog
   list and ALWAYS give the full link https://elektrix.in/product/<slug> for each.
   COMPARISONS: compare only products present in the catalog list, on price and features given.
6. CANCELLATION: if the customer wants to cancel an order, show the order's details
   (product, amount, order number) and ask them to confirm. ONLY when their latest
   message clearly confirms (yes / confirm / cancel it), output on the LAST line:
   CANCEL_ORDER: <order_number>
   If they ask to cancel multiple/unclear orders, ask which one. Never emit CANCEL_ORDER
   without a prior explicit confirmation from the customer.
7. TICKETS: if the customer wants a refund, human agent, or to file a complaint, end with
   RAISE_TICKET: <one-line summary>.

CUSTOMER'S RECENT ORDERS (newest first):
{orders}

CATALOG (for suggestions/comparisons — name | price | link):
{catalog}

CONVERSATION SO FAR:
{history}
"""


async def build_context(session: AsyncSession, user_id: str, user_name: str) -> tuple[str, str, str]:
    """Returns (orders_block, catalog_block, history-ready system prompt prefix)."""
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

    cat_res = await session.execute(text("""
        SELECT p.name, p.price, p.slug,
               COALESCE(p.short_description, left(p.description, 90), '') AS blurb
        FROM products p
        WHERE p.business_id = :bid AND p.status = 'ACTIVE'
        ORDER BY p.created_at DESC LIMIT 15
    """), {"bid": str(bid)})
    cat_lines = [
        f"- {r['name']} | Rs {r['price'] / 100:.0f} | https://elektrix.in/product/{r['slug']} | {r['blurb'][:70]}"
        for r in cat_res.mappings()
    ]
    catalog_block = "\n".join(cat_lines) or "- Catalog temporarily unavailable."

    return orders_block, catalog_block, user_name


async def ask_gemini(session: AsyncSession, user_id: str, user_name: str,
                     message: str, history: list[dict] | None = None) -> tuple[str, Optional[dict], Optional[str]]:
    """Returns (reply, ticket_action|None, cancel_order_number|None)."""
    from google import genai

    orders_block, catalog_block, _ = await build_context(session, user_id, user_name)
    hist = ""
    for h in (history or [])[-6:]:
        who = "CUSTOMER" if h.get("role") == "user" else "YOU"
        hist += f"{who}: {h.get('text', '')}\n"

    prompt = SYSTEM_PROMPT.format(name=user_name or "there", orders=orders_block,
                                  catalog=catalog_block, history=hist or "(new conversation)")
    prompt += f"CUSTOMER'S LATEST MESSAGE:\n{message}"

    client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
    reply, last_err = None, None
    for model in [m.strip() for m in settings.gemini_chat_models.split(",") if m.strip()]:
        try:
            resp = client.models.generate_content(model=model, contents=prompt)
            reply = (resp.text or "").strip()
            break
        except Exception as exc:
            logger.warning("chatbot model %s failed: %s", model, str(exc)[:150])
            last_err = exc
    if reply is None:
        raise last_err or RuntimeError("no chat models configured")

    ticket_action = cancel_number = None
    m = re.search(r"RAISE_TICKET:\s*(.+)", reply)
    if m:
        reply = reply[: m.start()].strip()
        category = "payment" if re.search(r"payment|pay|refund|charged|txn", message, re.I) else (
            "order" if re.search(r"order|deliver|ship", message, re.I) else "other")
        ticket_action = {"category": category, "subject": m.group(1).strip()[:200],
                         "description": message.strip()[:3000]}
    c = re.search(r"CANCEL_ORDER:\s*(ELK-[A-Za-z0-9-]+)", reply)
    if c:
        cancel_number = c.group(1)
        reply = reply[: c.start()].strip()
    return reply, ticket_action, cancel_number
