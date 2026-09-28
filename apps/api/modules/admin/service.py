"""Admin service: real dashboard analytics, user directory, and runtime store
settings (COD, shipping, banners) persisted in business_settings."""
import json
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from core.store import get_store_business_id, get_store_settings
from modules.admin.schemas import DashboardStats, StoreSettingsUpdate, AdminInviteRequest


class AdminService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def activity(self, limit: int = 15) -> list[dict]:
        """Recent store activity for the admin notification bell: order and
        payment status changes from the last 3 days, newest first."""
        bid = await get_store_business_id(self.session)
        # Cast status to text: orders.status (orderstatus) and payments.status
        # (paymentstatus) are distinct enum types and UNION cannot mix them.
        res = await self.session.execute(text("""
            SELECT 'order' AS kind, o.id AS order_id, o.order_number AS ref,
                   o.status::text AS status, o.total AS total, o.updated_at AS at
            FROM orders o
            WHERE o.business_id = :bid AND o.deleted_at IS NULL
              AND o.updated_at > now() - interval '3 days'
            UNION ALL
            SELECT 'payment' AS kind, o.id AS order_id, o.order_number AS ref,
                   p.status::text AS status, p.amount AS total, p.updated_at AS at
            FROM payments p
            JOIN orders o ON o.id = p.order_id
            WHERE o.business_id = :bid
              AND p.updated_at > now() - interval '3 days'
            ORDER BY at DESC
            LIMIT :limit
        """), {"bid": bid, "limit": limit})
        return [
            {
                "kind": r["kind"],
                "order_id": str(r["order_id"]),
                "ref": r["ref"],
                "status": r["status"],
                "total": r["total"],
                "at": r["at"].isoformat(),
            }
            for r in res.mappings()
        ]

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

    async def suspend_user(self, user_id: str, reason: str) -> None:
        """Suspend a customer account with a user-visible reason."""
        # users RLS: UPDATE only matches rows whose id == app.user_id, so set
        # the context to the TARGET user for this statement.
        await self.session.execute(
            text("SELECT set_config('app.user_id', :u, true)"), {"u": user_id},
        )
        res = await self.session.execute(
            text("UPDATE users SET suspended = true, suspension_reason = :r WHERE id = :u"),
            {"r": reason.strip() or "Policy violation", "u": user_id},
        )
        if res.rowcount == 0:
            raise DomainException("User not found", code="NOT_FOUND", status_code=404)
        await self._revoke_user_sessions(user_id)
        await self.session.commit()

    async def unsuspend_user(self, user_id: str) -> None:
        await self.session.execute(
            text("SELECT set_config('app.user_id', :u, true)"), {"u": user_id},
        )
        res = await self.session.execute(
            text("UPDATE users SET suspended = false, suspension_reason = NULL WHERE id = :u"),
            {"u": user_id},
        )
        if res.rowcount == 0:
            raise DomainException("User not found", code="NOT_FOUND", status_code=404)
        await self.session.commit()

    async def delete_user(self, user_id: str) -> None:
        """Admin hard-remove of an account, preserving order/payment history.

        The row stays (orders reference user_id) but every personal field is
        anonymized and sign-in is impossible. Order history remains intact
        for the business record, as required.
        """
        row = (await self.session.execute(
            text("SELECT email, first_name, last_name, phone FROM users WHERE id = :u"),
            {"u": user_id},
        )).mappings().first()
        if not row:
            raise DomainException("User not found", code="NOT_FOUND", status_code=404)

        bid = await get_store_business_id(self.session)
        role = (await self.session.execute(text(
            "SELECT role FROM business_members WHERE business_id = :bid AND user_id = :uid LIMIT 1"
        ), {"bid": bid, "uid": user_id})).scalar()
        if role in ("owner", "platform_admin"):
            raise DomainException(
                "Staff accounts cannot be deleted here", code="FORBIDDEN", status_code=403,
            )

        # users RLS: the anonymize UPDATE only matches when app.user_id is
        # the target user — switch the context for the remainder of the tx.
        await self.session.execute(
            text("SELECT set_config('app.user_id', :u, true)"), {"u": user_id},
        )

        anon_email = f"deleted-{user_id[:8]}@deleted.elektrix.invalid"
        await self.session.execute(text("""
            UPDATE users SET
                email = :e, first_name = 'Deleted', last_name = 'User',
                phone = NULL, is_active = false, deleted_at = now(),
                suspended = false, suspension_reason = NULL,
                password_hash = 'deleted:account', mfa_enabled = false,
                addresses = '[]'::json, wishlist = '[]'::json
            WHERE id = :u
        """), {"e": anon_email, "u": user_id})
        await self.session.commit()
        await self._revoke_user_sessions(user_id)
        await self.session.commit()

    async def _revoke_user_sessions(self, user_id: str) -> None:
        """Kill every active session family for the user (best-effort)."""
        try:
            from core.redis import redis_manager
            redis = redis_manager.client
            fams = await redis.smembers(f"auth:user:{user_id}:families") or []
            for fam in fams:
                fam = fam.decode() if isinstance(fam, bytes) else fam
                await redis.delete(f"auth:family:{fam}")
            await redis.delete(f"auth:user:{user_id}:families")
        except Exception:
            pass

    async def customer_overview(self, user_id: str) -> dict:
        """Everything the admin needs about one customer: profile, orders,
        payments and saved addresses — from live data."""
        profile = (await self.session.execute(text("""
            SELECT id, email, first_name, last_name, phone, is_active, suspended,
                   suspension_reason, is_email_verified, created_at,
                   COALESCE(addresses, '[]'::json) AS addresses
            FROM users WHERE id = :u
        """), {"u": user_id})).mappings().first()
        if not profile:
            # The admin customers list may pass a legacy customers-record id;
            # resolve the account via that record's email.
            cust_email = (await self.session.execute(text(
                "SELECT email FROM customers WHERE id = :u"
            ), {"u": user_id})).scalar()
            if cust_email:
                profile = (await self.session.execute(text("""
                    SELECT id, email, first_name, last_name, phone, is_active, suspended,
                           suspension_reason, is_email_verified, created_at,
                           COALESCE(addresses, '[]'::json) AS addresses
                    FROM users WHERE lower(email) = lower(:e)
                """), {"e": cust_email})).mappings().first()
        if not profile:
            raise DomainException("User not found", code="NOT_FOUND", status_code=404)

        orders = (await self.session.execute(text("""
            SELECT o.id, o.order_number, o.status::text AS status, o.total, o.created_at,
                   (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id)::int AS items
            FROM orders o
            WHERE o.user_id = :u
            ORDER BY o.created_at DESC
            LIMIT 100
        """), {"u": user_id})).mappings().all()

        payments = (await self.session.execute(text("""
            SELECT p.id, p.order_id, o.order_number, p.status::text AS status,
                   p.amount, p.currency, p.provider::text AS provider, p.created_at
            FROM payments p
            LEFT JOIN orders o ON o.id = p.order_id
            WHERE p.user_id = :u
            ORDER BY p.created_at DESC
            LIMIT 100
        """), {"u": user_id})).mappings().all()

        addresses = (await self.session.execute(text("""
            SELECT id, COALESCE(label, 'Address') AS label, full_name, phone,
                   line1, line2, city, state, pincode, is_default
            FROM addresses WHERE user_id = :u
            ORDER BY is_default DESC, created_at DESC
        """), {"u": user_id})).mappings().all()

        return {
            "profile": dict(profile),
            "orders": [dict(o) for o in orders],
            "payments": [dict(x) for x in payments],
            "addresses": [dict(a) for a in addresses],
        }

    async def list_users(self, q: Optional[str], page: int, page_size: int):
        filters = ""
        params: dict = {"lim": page_size, "off": (page - 1) * page_size}
        if q:
            filters = "WHERE u.email ILIKE :q OR u.first_name ILIKE :q OR u.last_name ILIKE :q"
            params["q"] = f"%{q}%"
        rows = (await self.session.execute(text(f"""
            SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.suspended,
                   u.suspension_reason, u.created_at,
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
            "banner_starts_at": "starts_at", "banner_ends_at": "ends_at",
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
            "min_order_paise": fields.get("min_order_paise", current.get("min_order_paise", 0)),
            "banner": banner,
            "announcement": fields.get("announcement", current.get("announcement")),
            "hero_slides": fields.get("hero_slides", current.get("hero_slides", [])),
            "promo_tiles": fields.get("promo_tiles", current.get("promo_tiles", [])),
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

    async def invite_admin(self, data: AdminInviteRequest) -> None:
        from passlib.hash import argon2
        from modules.users.models import User
        import uuid
        
        bid = await get_store_business_id(self.session)
        
        # Check if user exists
        user_id = (await self.session.execute(text("SELECT id FROM users WHERE email = :email"), {"email": data.email})).scalar()
        
        if not user_id:
            user_id = str(uuid.uuid4())
            await self.session.execute(text("""
                INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, is_email_verified)
                VALUES (:id, :email, :pw, :fn, :ln, true, true)
            """), {
                "id": user_id, "email": data.email, "pw": argon2.hash(data.password),
                "fn": data.first_name, "ln": data.last_name
            })
            
        # Insert into business_members
        existing = (await self.session.execute(text("""
            SELECT id FROM business_members WHERE business_id = :bid AND user_id = :uid LIMIT 1
        """), {"bid": bid, "uid": user_id})).scalar()
        
        if not existing:
            # Use a valid RoleType value. 'admin' is not a known role and is
            # absent from the RLS staff check, so invited users would have
            # been silently non-functional. Invites grant the LEAST privilege
            # that still works: staff (owners can promote afterwards).
            await self.session.execute(text("""
                INSERT INTO business_members (id, business_id, user_id, role)
                VALUES (:id, :bid, :uid, 'staff')
            """), {"id": str(uuid.uuid4()), "bid": bid, "uid": user_id})

        await self.session.commit()

    async def revoke_admin(self, user_id: str) -> None:
        bid = await get_store_business_id(self.session)
        # Guard: never allow revoking the last owner or an owner record
        # outright — ownership transfers must be deliberate.
        role = (await self.session.execute(text("""
            SELECT role FROM business_members WHERE business_id = :bid AND user_id = :uid LIMIT 1
        """), {"bid": bid, "uid": user_id})).scalar()
        if role == "owner":
            raise DomainException(
                "Owners cannot be revoked via this endpoint", code="FORBIDDEN", status_code=403
            )
        await self.session.execute(text("""
            DELETE FROM business_members WHERE business_id = :bid AND user_id = :uid
        """), {"bid": bid, "uid": user_id})
        await self.session.commit()
