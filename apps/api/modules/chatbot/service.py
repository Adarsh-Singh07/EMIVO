"""Gemini support chatbot. Strictly scoped to the signed-in user's OWN
orders/payments (queries run under RLS with their app.user_id), and able
to raise a support ticket on their behalf when they ask."""
import re
import logging
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are ELEKTRIX's support assistant. You help this logged-in customer with
THEIR OWN orders and payments only, using the CUSTOMER DATA below. Rules:
- Never invent order numbers, amounts, statuses or dates. If data is missing, say so.
- Keep replies short (2-5 sentences), friendly, plain text.
- Payment flow knowledge: unpaid orders can be retried for 2 hours from the orders page
  ("Complete Payment"); failed payments can be retried the same way; after the window,
  reorder. Flash-sale items release stock immediately on failure.
- If the customer clearly wants a refund, human agent, or to file a complaint, END YOUR REPLY
  with exactly: RAISE_TICKET: <one-line summary> — and nothing after it.
- Do not discuss other customers, internal systems, or non-support topics.

CUSTOMER DATA (their recent orders):
{context}
"""


async def build_user_context(session: AsyncSession, user_id: str) -> str:
    # Set the RLS context — orders are invisible without the owner GUC.
    await session.execute(
        text("SELECT set_config('app.user_id', :uid, true)"), {"uid": user_id}
    )
    res = await session.execute(text("""
        SELECT o.order_number, o.status, o.payment_method, o.total, o.created_at,
               COALESCE(p.txnid, '') AS txnid, COALESCE(p.pay_status, '') AS pay_status
        FROM orders o
        LEFT JOIN LATERAL (
            SELECT metadata_info->>'txnid' AS txnid, status::text AS pay_status
            FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
        ) p ON true
        WHERE o.user_id = :uid AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC LIMIT 5
    """), {"uid": user_id})
    lines = []
    for r in res.mappings():
        lines.append(
            f"- Order {r['order_number']} | status {r['status']} | payment {r['payment_method']} "
            f"Rs {r['total'] / 100:.0f} | placed {r['created_at']:%d %b %H:%M} | "
            f"payment status: {r['pay_status'] or 'n/a'}"
        )
    return "\n".join(lines) or "- No orders yet."


def _models() -> list[str]:
    return [m.strip() for m in settings.gemini_chat_models.split(",") if m.strip()]


async def ask_gemini(session: AsyncSession, user_id: str, message: str) -> tuple[str, Optional[dict]]:
    """Returns (reply, ticket_action|None). Tries each configured model in
    order, moving on when one is rate-limited/unavailable."""
    from google import genai  # google-genai SDK

    context = await build_user_context(session, user_id)
    prompt = SYSTEM_PROMPT.format(context=context) + f"\nCUSTOMER MESSAGE:\n{message}"

    client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
    reply: Optional[str] = None
    last_err: Optional[Exception] = None
    for model in _models():
        try:
            resp = client.models.generate_content(model=model, contents=prompt)
            reply = (resp.text or "").strip()
            break
        except Exception as exc:  # 429 quota, 5xx, deprecation → try next model
            logger.warning("chatbot model %s failed: %s", model, str(exc)[:150])
            last_err = exc
    if reply is None:
        raise last_err or RuntimeError("no chat models configured")

    ticket_action = None
    m = re.search(r"RAISE_TICKET:\s*(.+)", reply)
    if m:
        reply = reply[: m.start()].strip()
        summary = m.group(1).strip()[:200]
        category = "payment" if re.search(r"payment|pay|refund|charged|txn", message, re.I) else (
            "order" if re.search(r"order|deliver|ship", message, re.I) else "other")
        ticket_action = {"category": category, "subject": summary,
                         "description": message.strip()[:3000]}
    return reply, ticket_action
