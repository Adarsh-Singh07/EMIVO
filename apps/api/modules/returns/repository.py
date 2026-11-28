from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from modules.returns.models import ReturnRequest


class ReturnRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, return_id: str) -> Optional[ReturnRequest]:
        res = await self.session.execute(
            select(ReturnRequest).where(ReturnRequest.id == str(return_id))
        )
        return res.scalar_one_or_none()

    async def create(self, rr: ReturnRequest) -> ReturnRequest:
        self.session.add(rr)
        await self.session.flush()
        return rr

    async def sum_active_qty_for_item(self, order_item_id: str) -> int:
        res = await self.session.execute(
            text(
                "SELECT COALESCE(SUM(qty), 0) FROM return_requests "
                "WHERE order_item_id = :iid AND status NOT IN ('REJECTED', 'CLOSED')"
            ),
            {"iid": str(order_item_id)},
        )
        return int(res.scalar() or 0)

    async def sum_active_refund_for_order(
        self, order_id: str, exclude_return_id: Optional[str] = None
    ) -> int:
        if exclude_return_id:
            res = await self.session.execute(
                text(
                    "SELECT COALESCE(SUM(refund_amount), 0) FROM return_requests "
                    "WHERE order_id = :oid AND id != :rid AND status NOT IN ('REJECTED', 'CLOSED')"
                ),
                {"oid": str(order_id), "rid": str(exclude_return_id)},
            )
        else:
            res = await self.session.execute(
                text(
                    "SELECT COALESCE(SUM(refund_amount), 0) FROM return_requests "
                    "WHERE order_id = :oid AND status NOT IN ('REJECTED', 'CLOSED')"
                ),
                {"oid": str(order_id)},
            )
        return int(res.scalar() or 0)

    async def sum_returned_qty_for_order(self, order_id: str) -> int:
        res = await self.session.execute(
            text(
                "SELECT COALESCE(SUM(qty), 0) FROM return_requests "
                "WHERE order_id = :oid AND status IN ('RETURNED', 'REFUNDED')"
            ),
            {"oid": str(order_id)},
        )
        return int(res.scalar() or 0)

    async def get_enriched_by_id(self, return_id: str) -> Optional[Dict[str, Any]]:
        res = await self.session.execute(
            text(
                """
                SELECT
                    rr.*,
                    o.order_number,
                    o.payment_method,
                    o.delivered_at,
                    o.shipping_address->>'full_name' AS ship_name,
                    o.shipping_address->>'city' AS customer_city,
                    o.shipping_address->>'pincode' AS customer_pincode,
                    oi.product_id,
                    oi.product_name,
                    oi.variant_name,
                    oi.unit_price,
                    oi.quantity AS purchased_qty,
                    COALESCE(s.business_name, oi.seller_name, 'Apana Enterprises') AS seller_name,
                    NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS user_full_name,
                    u.email AS customer_email
                FROM return_requests rr
                JOIN orders o ON o.id = rr.order_id
                JOIN order_items oi ON oi.id = rr.order_item_id
                LEFT JOIN sellers s ON s.id = rr.seller_id
                LEFT JOIN users u ON u.id = rr.user_id
                WHERE rr.id = :rid
                """
            ),
            {"rid": str(return_id)},
        )
        row = res.mappings().first()
        return dict(row) if row else None

    async def list_enriched(
        self,
        *,
        user_id: Optional[str] = None,
        seller_id: Optional[str] = None,
        order_id: Optional[str] = None,
        status: Optional[str] = None,
        q: Optional[str] = None,
        include_customer_pii: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        where_clauses = ["1=1"]
        params: Dict[str, Any] = {}

        if user_id:
            where_clauses.append("rr.user_id = :uid")
            params["uid"] = str(user_id)
        if seller_id:
            where_clauses.append("rr.seller_id = :sid")
            params["sid"] = str(seller_id)
        if order_id:
            where_clauses.append("rr.order_id = :oid")
            params["oid"] = str(order_id)
        if status and status.upper() != "ALL":
            where_clauses.append("rr.status = :status")
            params["status"] = status.upper()
        if q and q.strip():
            where_clauses.append(
                "(rr.return_number ILIKE :q OR o.order_number ILIKE :q "
                "OR oi.product_name ILIKE :q OR u.email ILIKE :q "
                "OR o.shipping_address->>'full_name' ILIKE :q)"
            )
            params["q"] = f"%{q.strip()}%"

        where_sql = " AND ".join(where_clauses)
        count_sql = f"""
            SELECT COUNT(*)
            FROM return_requests rr
            JOIN orders o ON o.id = rr.order_id
            JOIN order_items oi ON oi.id = rr.order_item_id
            LEFT JOIN users u ON u.id = rr.user_id
            WHERE {where_sql}
        """
        total = int((await self.session.execute(text(count_sql), params)).scalar() or 0)

        pii_cols = (
            "NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS user_full_name, "
            "u.email AS customer_email, "
            "o.shipping_address->>'full_name' AS ship_name, "
            if include_customer_pii
            else "NULL::text AS user_full_name, NULL::text AS customer_email, NULL::text AS ship_name, "
        )

        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        list_sql = f"""
            SELECT
                rr.*,
                o.order_number,
                o.payment_method,
                o.delivered_at,
                {pii_cols}
                o.shipping_address->>'city' AS customer_city,
                o.shipping_address->>'pincode' AS customer_pincode,
                oi.product_id,
                oi.product_name,
                oi.variant_name,
                oi.unit_price,
                oi.quantity AS purchased_qty,
                COALESCE(s.business_name, oi.seller_name, 'Apana Enterprises') AS seller_name
            FROM return_requests rr
            JOIN orders o ON o.id = rr.order_id
            JOIN order_items oi ON oi.id = rr.order_item_id
            LEFT JOIN sellers s ON s.id = rr.seller_id
            LEFT JOIN users u ON u.id = rr.user_id
            WHERE {where_sql}
            ORDER BY rr.created_at DESC
            LIMIT :limit OFFSET :offset
        """
        rows = (await self.session.execute(text(list_sql), params)).mappings().all()
        return [dict(r) for r in rows], total
