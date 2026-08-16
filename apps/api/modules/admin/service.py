"""Admin service: real dashboard analytics, user directory, and runtime store
settings (COD, shipping, banners) persisted in business_settings."""
import json
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.store import get_store_business_id, get_store_settings
from modules.admin.schemas import DashboardStats, StoreSettingsUpdate


class AdminService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def dashboard(self) -> DashboardStats:
        bid = await get_store_business_id(self.session)

        today = (await self.session.execute(text("""
            SELECT count(*)::int,
                   COALESCE(sum(total) FILTER (WHERE status NOT IN ('CANCELLED','REFUNDED')), 0)::int
            FROM orders
            WHERE business_id = :bid AND deleted_at IS NULL
              AND created_at >= date_trunc('day', now())
        """), {"bid": bid})).one()

        status_counts = (await self.session.execute(text("""
            SELECT status, count(*)::int FROM orders
            WHERE business_id = :bid AND deleted_at IS NULL
              AND status IN ('PENDING','CONFIRMED','PROCESSING')
            GROUP BY status
        """), {"bid": bid})).fetchall()
        by_status = {s: c for s, c in status_counts}

        stock = (await self.session.execute(text("""
            SELECT
              count(*) FILTER (WHERE i.on_hand - i.reserved <= 0)::int AS out_of_stock,
              count(*) FILTER (WHERE i.on_hand - i.reserved > 0 AND i.on_hand - i.reserved <= i.low_stock_threshold)::int AS low
            FROM inventory i WHERE i.business_id = :bid
        """), {"bid": bid})).one()

        pending_payments = (await self.session.execute(text("""
            SELECT count(*)::int FROM payments p
            JOIN orders o ON o.id = p.order_id
            WHERE o.business_id = :bid AND p.status = 'PENDING'
        """), {"bid": bid})).scalar()

        customers = (await self.session.execute(text("""
            SELECT count(DISTINCT user_id)::int FROM orders
            WHERE business_id = :bid AND user_id IS NOT NULL
        """), {"bid": bid})).scalar()

        offers = (await self.session.execute(text("""
            SELECT count(*)::int FROM products
            WHERE business_id = :bid AND status = 'ACTIVE'
              AND sale_price IS NOT NULL AND sale_price > 0
              AND offer_starts_at IS NOT NULL AND offer_starts_at <= now()
              AND (offer_ends_at IS NULL OR offer_ends_at >= now())
        """), {"bid": bid})).scalar()

        revenue_14d = (await self.session.execute(text("""
            SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
                   COALESCE(sum(o.total), 0)::int AS revenue_paise,
                   count(o.id)::int AS orders
            FROM generate_series(date_trunc('day', now()) - interval '13 days',
                                 date_trunc('day', now()), interval '1 day') AS d(day)
            LEFT JOIN orders o
              ON date_trunc('day', o.created_at) = d.day
             AND o.business_id = :bid AND o.deleted_at IS NULL
             AND o.status NOT IN ('CANCELLED', 'REFUNDED')
            GROUP BY d.day ORDER BY d.day
        """), {"bid": bid})).mappings().all()

        recent_orders = (await self.session.execute(text("""
            SELECT id, order_number, status, total, payment_method,
                   created_at, shipping_address->>'full_name' AS customer_name
            FROM orders
            WHERE business_id = :bid AND deleted_at IS NULL
            ORDER BY created_at DESC LIMIT 10
        """), {"bid": bid})).mappings().all()

        top_products = (await self.session.execute(text("""
            SELECT oi.product_id, oi.product_name,
                   sum(oi.quantity)::int AS qty,
                   sum(oi.subtotal)::int AS revenue_paise
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.business_id = :bid AND o.deleted_at IS NULL
              AND o.created_at >= now() - interval '30 days'
              AND o.status NOT IN ('CANCELLED', 'REFUNDED')
            GROUP BY oi.product_id, oi.product_name
            ORDER BY revenue_paise DESC LIMIT 8
        """), {"bid": bid})).mappings().all()

        return DashboardStats(
            today_orders=today[0],
            today_revenue_paise=today[1],
            pending_orders=by_status.get("PENDING", 0),
            processing_orders=by_status.get("PROCESSING", 0) + by_status.get("CONFIRMED", 0),
            low_stock_count=stock.low,
            out_of_stock_count=stock.out_of_stock,
            pending_payments=pending_payments,
            total_customers=customers,
            active_offers=offers,
            revenue_14d=[dict(r) for r in revenue_14d],
            recent_orders=[
                {
                    "id": str(r["id"]), "order_number": r["order_number"],
                    "status": str(r["status"]), "total": r["total"],
                    "payment_method": r["payment_method"],
                    "customer_name": r["customer_name"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in recent_orders
            ],
            top_products_30d=[dict(r) for r in top_products],
        )

    # ------------------------------------------------------------------ #
    # Users directory                                                       #
    # ------------------------------------------------------------------ #

    async def list_users(self, q: Optional[str], page: int, page_size: int):
        filters = ""
        params: dict = {"lim": page_size, "off": (page - 1) * page_size}
        if q:
            filters = "WHERE u.email ILIKE :q OR u.first_name ILIKE :q OR u.last_name ILIKE :q"
            params["q"] = f"%{q}%"
        rows = (await self.session.execute(text(f"""
            SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.created_at,
                   COALESCE(array_agg(bm.role) FILTER (WHERE bm.role IS NOT NULL), ARRAY[]::text[]) AS roles
            FROM users u
            LEFT JOIN business_members bm ON bm.user_id = u.id
            {filters}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT :lim OFFSET :off
        """), params)).mappings().all()
        total = (await self.session.execute(text(f"""
            SELECT count(*) FROM users u {filters}
        """), params)).scalar()
        return [dict(r) for r in rows], total

    # ------------------------------------------------------------------ #
    # Store settings (COD / shipping / banner)                              #
    # ------------------------------------------------------------------ #

    async def get_settings(self) -> dict:
        return await get_store_settings(self.session)

    async def update_settings(self, update: StoreSettingsUpdate) -> dict:
        bid = await get_store_business_id(self.session)
        current = await self.get_settings()

        banner = dict(current.get("banner") or {})
        changed = False
        fields = update.model_dump(exclude_unset=True)

        banner_field_map = {
            "banner_title": "title", "banner_subtitle": "subtitle",
            "banner_image_url": "image_url", "banner_link": "link",
            "banner_active": "active",
        }
        for key, value in fields.items():
            if key in banner_field_map:
                banner[banner_field_map[key]] = value
                changed = True

        store_cfg = {
            "cod_enabled": fields.get("cod_enabled", current["cod_enabled"]),
            "cod_fee_paise": fields.get("cod_fee_paise", current["cod_fee_paise"]),
            "cod_max_order_paise": fields.get("cod_max_order_paise", current["cod_max_order_paise"]),
            "free_shipping_threshold_paise": fields.get(
                "free_shipping_threshold_paise", current["free_shipping_threshold_paise"]
            ),
            "flat_shipping_paise": fields.get("flat_shipping_paise", current["flat_shipping_paise"]),
            "banner": banner,
            "announcement": fields.get("announcement", current.get("announcement")),
        }

        await self.session.execute(text("""
            INSERT INTO business_settings (id, business_id, config)
            VALUES (gen_random_uuid()::text, :bid, jsonb_build_object('store', CAST(:cfg AS jsonb)))
            ON CONFLICT (business_id)
            DO UPDATE SET config = business_settings.config || jsonb_build_object('store', CAST(:cfg AS jsonb)),
                          updated_at = now()
        """), {"bid": bid, "cfg": json.dumps(store_cfg)})
        await self.session.commit()
        return await self.get_settings()
