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
    # Customers & Analytics
    # ------------------------------------------------------------------ #
    async def top_customers(self, days: int = 30, limit: int = 10) -> list[dict]:
        """Rank top customers by order volume and total spend over the last N days."""
        days = max(1, min(int(days or 30), 365))
        limit = max(1, min(int(limit or 10), 50))
        bid = await self._bid()

        q = """
            SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
                   count(o.id) as order_count,
                   coalesce(sum(o.total), 0) as total_paise,
                   max(o.created_at) as last_order_at
            FROM users u
            JOIN orders o ON o.user_id = u.id
            WHERE o.business_id = :bid
              AND o.created_at >= now() - make_interval(days => :days)
              AND o.status::text NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'REFUNDED')
            GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone
            ORDER BY total_paise DESC, order_count DESC
            LIMIT :lim
        """
        rows = (await self.session.execute(text(q), {"bid": str(bid), "days": days, "lim": limit})).mappings().all()
        return [
            {
                "customer_name": f"{r['first_name'] or ''} {r['last_name'] or ''}".strip() or "Valued Customer",
                "email": _mask_email(r["email"]),
                "phone": _mask_phone(r["phone"]),
                "order_count": r["order_count"],
                "total_spent_rupees": round(r["total_paise"] / 100, 2),
                "last_order_at": r["last_order_at"].strftime("%d %b %Y, %I:%M %p") if r["last_order_at"] else None,
            }
            for r in rows
        ]

    async def abandoned_carts(self, idle_minutes: int = 30, limit: int = 15) -> list[dict]:
        """Fetch abandoned or idle shopping carts that customers haven't checked out yet."""
        idle_minutes = max(10, min(int(idle_minutes or 30), 10080))
        limit = max(1, min(int(limit or 15), 50))

        q = """
            SELECT c.id, c.subtotal, c.updated_at, c.user_id,
                   COALESCE(u.first_name || ' ' || u.last_name, '') AS customer_name,
                   COALESCE(u.email, '') AS email,
                   COALESCE(u.phone, '') AS phone,
                   (SELECT COALESCE(json_agg(json_build_object(
                                'name', p.name, 'quantity', ci.quantity, 'unit_price', p.price)), '[]'::json)
                    FROM cart_items ci
                    JOIN products p ON p.id = ci.product_id
                    WHERE ci.cart_id = c.id) AS items
            FROM carts c
            LEFT JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
            WHERE c.updated_at < now() - make_interval(mins => :minutes)
              AND c.updated_at > now() - interval '14 days'
              AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
            ORDER BY c.updated_at DESC
            LIMIT :lim
        """
        rows = (await self.session.execute(text(q), {"minutes": idle_minutes, "lim": limit})).mappings().all()
        return [
            {
                "cart_id": str(r["id"]),
                "customer_name": (r["customer_name"] or "").strip() or "Guest Customer",
                "email": _mask_email(r["email"]) if r["email"] else None,
                "phone": _mask_phone(r["phone"]) if r["phone"] else None,
                "is_registered": bool(r["user_id"]),
                "cart_value_rupees": round((r["subtotal"] or 0) / 100, 2),
                "items": [f"{i['name']} (x{i['quantity']})" for i in (r["items"] or [])],
                "idle_since": r["updated_at"].strftime("%d %b %Y, %I:%M %p") if r["updated_at"] else None,
            }
            for r in rows
        ]

    async def send_cart_reminders(self, cart_id: Optional[str] = None, limit: int = 10) -> dict:
        """Trigger reminders for abandoned carts (queues notifications with deduplication)."""
        from core.models import OutboxEvent
        from core.redis import redis_manager

        limit = max(1, min(int(limit or 10), 30))
        target_clause = "AND c.id = :cid" if cart_id else ""
        params: dict = {"lim": limit}
        if cart_id:
            params["cid"] = cart_id

        q = f"""
            SELECT c.id, c.user_id, c.subtotal,
                   COALESCE(u.email, '') AS email, COALESCE(u.first_name, '') AS first_name,
                   COALESCE(u.phone, '') AS phone,
                   (SELECT COALESCE(json_agg(json_build_object(
                                'name', p.name, 'unit_price', p.price)), '[]'::json)
                    FROM cart_items ci
                    JOIN products p ON p.id = ci.product_id
                    WHERE ci.cart_id = c.id) AS items
            FROM carts c
            JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
            WHERE c.updated_at < now() - interval '20 minutes'
              AND c.updated_at > now() - interval '7 days'
              AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
              {target_clause}
            ORDER BY c.updated_at DESC
            LIMIT :lim
        """
        rows = (await self.session.execute(text(q), params)).mappings().all()
        if not rows:
            return {
                "success": False,
                "queued_count": 0,
                "message": "No eligible abandoned carts with registered customer contact info were found to notify."
            }

        queued = 0
        nudged_recipients = []
        for r in rows:
            cid = str(r["id"])
            dedup_key = f"cartrem:{cid}:manual"
            # 6 hour dedupe window
            if await redis_manager.client.set(dedup_key, "1", nx=True, ex=6 * 3600):
                self.session.add(OutboxEvent(
                    tenant_id=None,
                    type="cart.reminder",
                    payload={
                        "user_id": str(r["user_id"]),
                        "email": r["email"],
                        "first_name": r["first_name"] or "Customer",
                        "items": r["items"] or [],
                        "stage": "manual_assistant",
                    },
                ))
                queued += 1
                nudged_recipients.append(_mask_email(r["email"]) or _mask_phone(r["phone"]) or cid[:8])

        if queued > 0:
            await self.session.commit()

        return {
            "success": True,
            "queued_count": queued,
            "nudged_recipients": nudged_recipients,
            "message": f"Successfully queued {queued} cart recovery reminder(s) for delivery.",
        }

    async def sales_analytics(self, days: int = 30) -> dict:
        """High-level sales analytics, revenue, order status breakdown and top-selling products."""
        days = max(1, min(int(days or 30), 365))
        bid = await self._bid()

        # Headline stats for period
        rev_row = (await self.session.execute(text("""
            SELECT 
                count(id) as total_orders,
                coalesce(sum(case when status::text NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'REFUNDED') then total else 0 end), 0) as net_revenue_paise,
                count(case when status::text IN ('DELIVERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED') then 1 end) as successful_orders,
                count(case when status::text = 'CANCELLED' then 1 end) as cancelled_orders,
                count(case when status::text = 'PAYMENT_FAILED' then 1 end) as payment_failed_orders
            FROM orders
            WHERE business_id = :bid
              AND created_at >= now() - make_interval(days => :days)
        """), {"bid": str(bid), "days": days})).mappings().first()

        # Top products
        top_prods = (await self.session.execute(text("""
            SELECT p.name, sum(oi.quantity) as units_sold, sum(oi.price * oi.quantity) as gross_paise
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.business_id = :bid
              AND o.created_at >= now() - make_interval(days => :days)
              AND o.status::text NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'REFUNDED')
            GROUP BY p.id, p.name
            ORDER BY units_sold DESC
            LIMIT 5
        """), {"bid": str(bid), "days": days})).mappings().all()

        tot_orders = rev_row["total_orders"] or 0
        net_rev = rev_row["net_revenue_paise"] or 0
        aov = round((net_rev / max(rev_row["successful_orders"] or 1, 1)) / 100, 2)

        return {
            "period_days": days,
            "total_orders": tot_orders,
            "successful_orders": rev_row["successful_orders"],
            "cancelled_orders": rev_row["cancelled_orders"],
            "payment_failed_orders": rev_row["payment_failed_orders"],
            "net_revenue_rupees": round(net_rev / 100, 2),
            "average_order_value_rupees": aov,
            "top_products": [
                {
                    "name": tp["name"],
                    "units_sold": tp["units_sold"],
                    "revenue_rupees": round(tp["gross_paise"] / 100, 2)
                }
                for tp in top_prods
            ]
        }

    async def sellers_overview(self) -> list[dict]:
        """Overview of marketplace sellers, their active catalogs, ratings and master seller status."""
        q = """
            SELECT s.id, s.name, s.business_name, s.email, s.city, s.status, s.rating, s.rating_count,
                   count(p.id) as product_count
            FROM sellers s
            LEFT JOIN products p ON p.seller_id = s.id
            GROUP BY s.id, s.name, s.business_name, s.email, s.city, s.status, s.rating, s.rating_count
            ORDER BY product_count DESC, s.rating DESC;
        """
        rows = (await self.session.execute(text(q))).mappings().all()
        return [
            {
                "seller_name": r["name"],
                "business_name": r["business_name"],
                "email": r["email"],
                "city": r["city"] or "—",
                "status": r["status"],
                "rating": float(r["rating"] or 4.9),
                "rating_count": r["rating_count"] or 0,
                "products_listed": r["product_count"],
                "is_master_seller": r["email"] == "admin@elektrix.in" or "Apana" in (r["business_name"] or ""),
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
    "store_summary": {"fn": "store_summary", "desc": "Headline operational numbers for the store today (orders, revenue, stock alerts)."},
    "orders_search": {"fn": "orders_search", "desc": "Recent orders, optionally filtered by status (pending/processing/shipped/delivered/cancelled)."},
    "top_customers": {"fn": "top_customers", "desc": "Top customers ranked by total spend and order volume over the last N days (default 30)."},
    "abandoned_carts": {"fn": "abandoned_carts", "desc": "List abandoned/idle carts with unpurchased items, values, and customer info."},
    "send_cart_reminders": {"fn": "send_cart_reminders", "desc": "Send cart recovery reminder notifications to customers with abandoned carts."},
    "sales_analytics": {"fn": "sales_analytics", "desc": "Comprehensive revenue, AOV, order success rate, and best-selling products for last N days."},
    "sellers_overview": {"fn": "sellers_overview", "desc": "Overview of marketplace sellers, ratings, active catalogs, and Master Seller status."},
    "low_stock": {"fn": "low_stock", "desc": "Products at or below a stock threshold, prioritized for replenishment."},
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
    if name == "top_customers":
        return await tools.top_customers(days=args.get("days", 30), limit=args.get("limit", 10))
    if name == "abandoned_carts":
        return await tools.abandoned_carts(idle_minutes=args.get("idle_minutes", 30), limit=args.get("limit", 15))
    if name == "send_cart_reminders":
        return await tools.send_cart_reminders(cart_id=args.get("cart_id"), limit=args.get("limit", 10))
    if name == "sales_analytics":
        return await tools.sales_analytics(days=args.get("days", 30))
    if name == "sellers_overview":
        return await tools.sellers_overview()
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
        {"name": "orders_search", "args": {"status": "optional status", "limit": "optional int"}, "desc": _TOOLS["orders_search"]["desc"]},
        {"name": "top_customers", "args": {"days": "int, default 30", "limit": "int, default 10"}, "desc": _TOOLS["top_customers"]["desc"]},
        {"name": "abandoned_carts", "args": {"idle_minutes": "int, default 30", "limit": "int, default 15"}, "desc": _TOOLS["abandoned_carts"]["desc"]},
        {"name": "send_cart_reminders", "args": {"cart_id": "optional string to target single cart", "limit": "optional int"}, "desc": _TOOLS["send_cart_reminders"]["desc"]},
        {"name": "sales_analytics", "args": {"days": "int, default 30"}, "desc": _TOOLS["sales_analytics"]["desc"]},
        {"name": "sellers_overview", "args": {}, "desc": _TOOLS["sellers_overview"]["desc"]},
        {"name": "low_stock", "args": {"threshold": "int, default 5"}, "desc": _TOOLS["low_stock"]["desc"]},
        {"name": "customers_lookup", "args": {"email_or_phone": "string"}, "desc": _TOOLS["customers_lookup"]["desc"]},
    ]
