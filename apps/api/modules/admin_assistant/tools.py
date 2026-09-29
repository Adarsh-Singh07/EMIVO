"""Read-only, RLS-scoped tools for the admin assistant.

Every tool returns a plain dict (JSON-safe) so the model can reason over
structured data. No tool can write, mutate or execute arbitrary SQL/shell —
that is a hard architectural boundary. PII is masked before leaving a tool.
"""
from __future__ import annotations

import re
from typing import Any, Optional

from sqlalchemy import text

from core.store import get_store_business_id
from modules.admin.service import AdminService


def _mask_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    d = re.sub(r"\D", "", phone)[-10:]
    if len(d) < 7:
        return "***"
    return f"{d[:5]}-****-{d[7:]}"


def _mask_email(email: Optional[str]) -> Optional[str]:
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    return f"{local[:1]}***@{domain}"


class AdminTools:
    """One instance per admin request. session carries the RLS context."""

    def __init__(self, session) -> None:
        self.session = session

    async def _bid(self):
        return await get_store_business_id(self.session)

    # ------------------------------------------------------------------ #
    # Store / orders / inventory
    # ------------------------------------------------------------------ #
    async def store_summary(self) -> dict:
        """Headline operational numbers for the store (today + 14-day)."""
        admin = AdminService(self.session)
        stats = await admin.dashboard()
        return {
            "today_orders": stats.today_orders,
            "today_revenue_paise": stats.today_revenue_paise,
            "pending_orders": stats.pending_orders,
            "processing_orders": stats.processing_orders,
            "low_stock_count": stats.low_stock_count,
            "out_of_stock_count": stats.out_of_stock_count,
            "pending_payments": stats.pending_payments,
            "total_customers": stats.total_customers,
            "active_offers": stats.active_offers,
        }

    async def orders_search(self, status: Optional[str] = None,
                           limit: int = 25) -> list[dict]:
        """Recent orders, optionally filtered by status. Money in paise."""
        limit = max(1, min(int(limit or 25), 100))
        bid = await self._bid()
        q = """
            SELECT o.order_number, o.status::text AS status, o.total,
                   o.created_at, o.payment_method
            FROM orders o
            WHERE o.business_id = :bid
        """
        params: dict = {"bid": str(bid), "lim": limit}
        if status:
            q += " AND o.status::text = :st"
            params["st"] = status
        q += " ORDER BY o.created_at DESC LIMIT :lim"
        rows = (await self.session.execute(text(q), params)).mappings().all()
        return [
            {
                "order_number": r["order_number"],
                "status": r["status"],
                "total_paise": r["total"],
                "payment_method": r["payment_method"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]

    async def low_stock(self, threshold: int = 5) -> list[dict]:
        """Products at or below a stock threshold (restock candidates)."""
        threshold = max(0, int(threshold or 5))
        bid = await self._bid()
        rows = (await self.session.execute(text("""
            SELECT p.name, (i.on_hand - i.reserved) AS available, i.low_stock_threshold
            FROM products p
            JOIN inventory i ON i.product_id = p.id
            WHERE i.business_id = :bid
              AND (i.on_hand - i.reserved) <= :th
            ORDER BY available ASC
            LIMIT 50
        """), {"bid": str(bid), "th": threshold})).mappings().all()
        return [
            {
                "name": r["name"],
                "available": r["available"],
                "threshold": r["low_stock_threshold"],
            }
            for r in rows
        ]

    # ------------------------------------------------------------------ #
    # Customers (PII masked)
    # ------------------------------------------------------------------ #
    async def customers_lookup(self, email_or_phone: str) -> dict:
        """Find a customer by email or phone. PII is masked before return."""
        bid = await self._bid()
        needle = (email_or_phone or "").strip()
        if not needle:
            return {"error": "Provide an email or phone to search."}
        # try email
        rows = (await self.session.execute(text("""
            SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at,
                   (SELECT count(*) FROM orders o WHERE o.user_id = u.id)::int AS orders,
                   (SELECT coalesce(sum(o.total),0) FROM orders o WHERE o.user_id = u.id) AS lifetime_paise
            FROM users u
            WHERE lower(u.email) = lower(:e) OR u.phone = :e
            LIMIT 3
        """), {"e": needle})).mappings().all()
        if not rows:
            # maybe a phone number typed loosely
            digits = re.sub(r"\D", "", needle)
            if digits and len(digits) >= 7:
                rows = (await self.session.execute(text("""
                    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at,
                           (SELECT count(*) FROM orders o WHERE o.user_id = u.id)::int AS orders,
                           (SELECT coalesce(sum(o.total),0) FROM orders o WHERE o.user_id = u.id) AS lifetime_paise
                    FROM users u
                    WHERE right(u.phone, 10) = :p10 OR u.phone = :pd
                    LIMIT 3
                """), {"p10": digits[-10:], "pd": digits})).mappings().all()
        out = []
        for r in rows:
            out.append({
                "id": r["id"],
                "email": _mask_email(r["email"]),
                "name": f"{r['first_name'] or ''} {r['last_name'] or ''}".strip() or "—",
                "phone": _mask_phone(r["phone"]),
                "orders": r["orders"],
                "lifetime_paise": r["lifetime_paise"],
                "since": r["created_at"].isoformat() if r["created_at"] else None,
            })
        return {"matches": out}


_TOOLS: dict[str, Any] = {
    "store_summary": {"fn": "store_summary", "desc": "Headline operational numbers for the store today."},
    "orders_search": {"fn": "orders_search", "desc": "Recent orders, optionally filtered by status (pending/processing/shipped/delivered/cancelled)."},
    "low_stock": {"fn": "low_stock", "desc": "Products at or below a stock threshold, for restocking."},
    "customers_lookup": {"fn": "customers_lookup", "desc": "Find a customer by email or phone (PII is masked)."},
}


def tool_names() -> list[str]:
    return list(_TOOLS.keys())


async def run_tool(tools: AdminTools, name: str, args: Optional[dict]) -> Any:
    """Dispatch a tool by name with validated args. Unknown tools raise."""
    if name not in _TOOLS:
        raise KeyError(f"Unknown tool: {name}")
    args = args or {}
    if name == "orders_search":
        return await tools.orders_search(status=args.get("status"), limit=args.get("limit"))
    if name == "low_stock":
        return await tools.low_stock(threshold=args.get("threshold"))
    if name == "customers_lookup":
        return await tools.customers_lookup(args.get("email_or_phone", ""))
    if name == "store_summary":
        return await tools.store_summary()
    raise KeyError(name)


def tool_specs() -> list[dict]:
    """JSON-ish spec for the prompt so the model knows the tool surface."""
    return [
        {"name": "store_summary", "args": {}, "desc": _TOOLS["store_summary"]["desc"]},
        {"name": "orders_search", "args": {"status": "optional", "limit": "optional int"}, "desc": _TOOLS["orders_search"]["desc"]},
        {"name": "low_stock", "args": {"threshold": "int, default 5"}, "desc": _TOOLS["low_stock"]["desc"]},
        {"name": "customers_lookup", "args": {"email_or_phone": "string"}, "desc": _TOOLS["customers_lookup"]["desc"]},
    ]
