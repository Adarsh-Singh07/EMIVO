import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from jose import jwt
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import async_session_maker
from core.exceptions import DomainException
from core.redis import redis_manager
from modules.sellers.models import Seller
from modules.sellers.schemas import (
    CategoryApprovalItem,
    CategorySuggestion,
    SellerCreateAdmin,
    SellerOrderItem,
    SellerProductCreate,
    SellerProductItem,
    SellerProductUpdate,
    SellerResponse,
)


def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return re.sub(r"^-+|-+$", "", s)


def _title_case(name: str) -> str:
    words = name.strip().split()
    out = []
    for w in words:
        if w.upper() in ("PC", "PCS", "GPS", "TWS", "ANC", "5G", "4G", "AMOLED", "LED", "USB", "&"):
            out.append(w.upper())
        elif w.lower() in ("and", "or", "of", "in", "for"):
            out.append(w.lower())
        else:
            out.append(w.capitalize())
    res = " ".join(out)
    if res and res[0].islower():
        res = res[0].upper() + res[1:]
    return res


class SellerService:
    OTP_LENGTH = 6
    OTP_TTL_SECONDS = 10 * 60  # 10 minutes

    def __init__(self, session: AsyncSession):
        self.session = session
        self.redis = redis_manager.client

    # -------------------------------------------------------------------------
    # Authentication (Email OTP Only - No Public Registration)
    # -------------------------------------------------------------------------

    async def request_otp(self, email: str) -> Dict[str, Any]:
        norm_email = email.strip().lower()
        stmt = select(Seller).where(func.lower(Seller.email) == norm_email)
        res = await self.session.execute(stmt)
        seller = res.scalar_one_or_none()

        if not seller:
            raise DomainException(
                "No seller account found with this email. Seller registration is by admin invitation only.",
                code="SELLER_NOT_FOUND",
                status_code=403,
            )

        if seller.status != "ACTIVE":
            raise DomainException(
                f"Your seller account is currently {seller.status.lower()}. Please contact Elektrix administration.",
                code="SELLER_INACTIVE",
                status_code=403,
            )

        # Generate 6-digit OTP
        code = f"{secrets.randbelow(10 ** self.OTP_LENGTH):0{self.OTP_LENGTH}d}"
        ident_hash = hashlib.sha256(f"seller:{norm_email}".encode()).hexdigest()
        otp_key = f"auth:seller:otp:{ident_hash}"

        await self.redis.hset(
            otp_key,
            mapping={"code": code, "seller_id": str(seller.id), "n": "0"},
        )
        await self.redis.expire(otp_key, self.OTP_TTL_SECONDS)

        # Queue OTP email in outbox
        from core.models import OutboxEvent
        self.session.add(
            OutboxEvent(
                tenant_id=None,
                type="auth.otp_login",
                payload={
                    "seller_id": str(seller.id),
                    "email": seller.email,
                    "code": code,
                    "first_name": seller.name,
                    "business_name": seller.business_name,
                    "is_seller": True,
                },
            )
        )
        await self.session.commit()

        # Best-effort immediate delivery
        try:
            from modules.notifications.service import NotificationService
            row = await self.session.execute(text(
                "SELECT id FROM outbox_events WHERE type = 'auth.otp_login' AND status = 'pending' "
                "ORDER BY created_at DESC LIMIT 1"
            ))
            eid = row.scalar()
            if eid:
                await NotificationService(self.session).process_outbox_event(str(eid))
        except Exception:
            pass

        return {
            "status": "accepted",
            "message": f"Verification code sent to {seller.email}",
            # In local dev environment, provide code hint for testing
            "debug_code": code if not settings.is_prod else None,
        }

    async def verify_otp(self, email: str, code: str) -> Dict[str, Any]:
        norm_email = email.strip().lower()
        ident_hash = hashlib.sha256(f"seller:{norm_email}".encode()).hexdigest()
        otp_key = f"auth:seller:otp:{ident_hash}"

        data = await self.redis.hgetall(otp_key)
        if not data:
            raise DomainException(
                "OTP expired or not found. Please request a new code.",
                code="OTP_EXPIRED",
                status_code=400,
            )

        stored_code = data.get("code")
        if not stored_code or stored_code != code.strip():
            await self.redis.hincrby(otp_key, "n", 1)
            raise DomainException("Invalid verification code", code="OTP_INVALID", status_code=400)

        # OTP verified -> delete single use
        await self.redis.delete(otp_key)

        stmt = select(Seller).where(func.lower(Seller.email) == norm_email)
        seller = (await self.session.execute(stmt)).scalar_one_or_none()
        if not seller:
            raise DomainException("Seller not found", code="NOT_FOUND", status_code=404)

        # Generate JWT token
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiration_minutes)
        to_encode = {
            "exp": expire,
            "sub": str(seller.id),
            "seller_id": str(seller.id),
            "business_id": str(seller.id),
            "roles": ["seller"],
            "business_name": seller.business_name,
            "email": seller.email,
            "jti": secrets.token_hex(16),
        }
        token = jwt.encode(
            to_encode, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "seller": {
                "id": str(seller.id),
                "name": seller.name,
                "business_name": seller.business_name,
                "email": seller.email,
                "city": seller.city,
                "status": seller.status,
                "rating": float(seller.rating),
            },
        }

    # -------------------------------------------------------------------------
    # Seller Products & Inventory
    # -------------------------------------------------------------------------

    async def list_seller_products(self, seller_id: str) -> List[SellerProductItem]:
        query = text("""
            SELECT 
                p.id, p.name, p.slug, p.sku, p.brand, p.price, p.mrp, p.sale_price,
                coalesce(sl.stock, i.on_hand, 0) as stock,
                p.status, p.category_id,
                c.name as category_name,
                pcat.name as parent_category_name,
                p.created_at
            FROM products p
            LEFT JOIN seller_listings sl ON sl.product_id = p.id AND sl.seller_id = :sid
            LEFT JOIN inventory i ON i.product_id = p.id
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN categories pcat ON pcat.id = c.parent_id
            WHERE p.seller_id = :sid AND p.status != 'ARCHIVED'
            ORDER BY p.created_at DESC;
        """)
        res = await self.session.execute(query, {"sid": seller_id})
        rows = res.mappings().all()

        # Load primary image for each product
        prod_ids = [r["id"] for r in rows]
        img_map = {}
        if prod_ids:
            img_res = await self.session.execute(
                text("SELECT product_id, media_url FROM product_media WHERE product_id = ANY(:pids) ORDER BY position ASC"),
                {"pids": prod_ids},
            )
            for pid, url in img_res:
                img_map.setdefault(pid, []).append(url)

        items = []
        for r in rows:
            items.append(
                SellerProductItem(
                    id=str(r["id"]),
                    name=r["name"],
                    slug=r.get("slug"),
                    sku=r.get("sku"),
                    brand=r.get("brand"),
                    price=int(r["price"]),
                    mrp=r.get("mrp"),
                    sale_price=r.get("sale_price"),
                    stock=int(r["stock"]),
                    status=str(r["status"]),
                    category_id=r.get("category_id"),
                    category_name=r.get("category_name"),
                    parent_category_name=r.get("parent_category_name"),
                    images=img_map.get(r["id"], []),
                    created_at=r.get("created_at"),
                )
            )
        return items

    async def create_seller_product(self, seller_id: str, data: SellerProductCreate) -> Dict[str, Any]:
        import uuid
        from modules.products.models import Product, ProductMedia
        from modules.inventory.models import Inventory

        # Ensure business_id is set (use Apna Enterprises business or store business id)
        store_bid = (await self.session.execute(text("SELECT id FROM businesses WHERE name = 'ELEKTRIX' LIMIT 1"))).scalar() or seller_id

        pid = str(uuid.uuid4())
        slug = _slugify(data.name) + f"-{pid[:6]}"
        price_paise = data.price * 100 if data.price < 500000 else data.price
        mrp_paise = (data.mrp * 100) if (data.mrp and data.mrp < 500000) else (data.mrp or price_paise)

        product = Product(
            id=pid,
            business_id=store_bid,
            seller_id=seller_id,
            name=data.name.strip(),
            slug=slug,
            brand=data.brand.strip() if data.brand else "ELEKTRIX",
            category_id=data.category_id,
            price=price_paise,
            mrp=mrp_paise,
            sku=data.sku or f"SKU-{pid[:8].upper()}",
            description=data.description,
            specs=data.specs or [],
            status="ACTIVE",
        )
        self.session.add(product)

        # Inventory
        inv = Inventory(
            id=str(uuid.uuid4()),
            product_id=pid,
            business_id=store_bid,
            on_hand=data.stock,
            reserved=0,
        )
        self.session.add(inv)

        # Seller listing
        await self.session.execute(text("""
            INSERT INTO seller_listings (
                id, product_id, seller_id, sku, price, mrp, stock, is_active, 
                estimated_delivery_days, rating, rating_count
            )
            VALUES (:id, :pid, :sid, :sku, :price, :mrp, :stock, TRUE, 3, 4.90, 1)
            ON CONFLICT (seller_id, product_id) DO UPDATE SET
                price = EXCLUDED.price,
                stock = EXCLUDED.stock;
        """), {
            "id": str(uuid.uuid4()),
            "pid": pid,
            "sid": seller_id,
            "sku": data.sku or f"SKU-{pid[:8].upper()}",
            "price": price_paise,
            "mrp": mrp_paise,
            "stock": data.stock,
        })

        # Media
        if data.images:
            for idx, img_url in enumerate(data.images):
                if img_url and img_url.strip():
                    self.session.add(
                        ProductMedia(
                            id=str(uuid.uuid4()),
                            product_id=pid,
                            media_url=img_url.strip(),
                            position=idx,
                        )
                    )

        await self.session.commit()
        return {"id": pid, "name": data.name, "slug": slug, "status": "created"}

    async def update_seller_product(self, seller_id: str, product_id: str, data: SellerProductUpdate) -> Dict[str, Any]:
        # Verify ownership
        row = (await self.session.execute(
            text("SELECT id FROM products WHERE id = :pid AND seller_id = :sid"),
            {"pid": product_id, "sid": seller_id},
        )).fetchone()
        if not row:
            raise DomainException("Product not found or access denied", code="NOT_FOUND", status_code=404)

        updates = []
        params: Dict[str, Any] = {"pid": product_id, "sid": seller_id}

        if data.price is not None:
            p_paise = data.price * 100 if data.price < 500000 else data.price
            updates.append("price = :price")
            params["price"] = p_paise
        if data.mrp is not None:
            m_paise = data.mrp * 100 if data.mrp < 500000 else data.mrp
            updates.append("mrp = :mrp")
            params["mrp"] = m_paise
        if data.status is not None:
            updates.append("status = :status")
            params["status"] = data.status
        if data.name is not None:
            updates.append("name = :name")
            params["name"] = data.name.strip()
        if data.description is not None:
            updates.append("description = :description")
            params["description"] = data.description

        if updates:
            sql = f"UPDATE products SET {', '.join(updates)}, updated_at = NOW() WHERE id = :pid AND seller_id = :sid"
            await self.session.execute(text(sql), params)

        # Update seller_listings & inventory stock
        if data.stock is not None:
            await self.session.execute(
                text("UPDATE inventory SET on_hand = :stock, updated_at = NOW() WHERE product_id = :pid"),
                {"stock": data.stock, "pid": product_id},
            )
            await self.session.execute(
                text("UPDATE seller_listings SET stock = :stock, updated_at = NOW() WHERE product_id = :pid AND seller_id = :sid"),
                {"stock": data.stock, "pid": product_id, "sid": seller_id},
            )

        if data.price is not None:
            await self.session.execute(
                text("UPDATE seller_listings SET price = :price, updated_at = NOW() WHERE product_id = :pid AND seller_id = :sid"),
                {"price": params["price"], "pid": product_id, "sid": seller_id},
            )

        await self.session.commit()
        return {"status": "updated", "product_id": product_id}

    async def delete_seller_product(self, seller_id: str, product_id: str) -> None:
        row = (await self.session.execute(
            text("SELECT id FROM products WHERE id = :pid AND seller_id = :sid"),
            {"pid": product_id, "sid": seller_id},
        )).fetchone()
        if not row:
            raise DomainException("Product not found or access denied", code="NOT_FOUND", status_code=404)

        # Soft archive to preserve order history
        await self.session.execute(
            text("UPDATE products SET status = 'ARCHIVED', updated_at = NOW() WHERE id = :pid AND seller_id = :sid"),
            {"pid": product_id, "sid": seller_id},
        )
        await self.session.execute(
            text("UPDATE seller_listings SET is_active = FALSE WHERE product_id = :pid AND seller_id = :sid"),
            {"pid": product_id, "sid": seller_id},
        )
        await self.session.commit()

    # -------------------------------------------------------------------------
    # Seller Orders & "Mark as Packed"
    # -------------------------------------------------------------------------

    async def get_seller_orders(self, seller_id: str) -> List[SellerOrderItem]:
        query = text("""
            SELECT 
                o.id as order_id,
                o.order_number,
                oi.id as item_id,
                oi.product_id,
                oi.product_name,
                oi.variant_name,
                oi.quantity,
                oi.unit_price,
                oi.total,
                coalesce(oi.seller_name, s.business_name, 'Apna Enterprises') as seller_name,
                o.status as order_status,
                o.shipping_address->>'city' as customer_city,
                o.shipping_address->>'pincode' as customer_pincode,
                o.created_at
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            LEFT JOIN sellers s ON s.id = p.seller_id
            WHERE p.seller_id = :sid OR oi.seller_id = :sid
            ORDER BY o.created_at DESC;
        """)
        res = await self.session.execute(query, {"sid": seller_id})
        rows = res.mappings().all()

        items = []
        for r in rows:
            # Map order fulfillment status
            status = str(r["order_status"]).upper()
            fulfillment = "PACKED" if status in ("PACKED", "SHIPPED", "DELIVERED") else "PENDING"

            items.append(
                SellerOrderItem(
                    order_id=str(r["order_id"]),
                    order_number=r.get("order_number"),
                    item_id=str(r["item_id"]),
                    product_id=str(r["product_id"]),
                    product_name=r["product_name"],
                    variant_name=r.get("variant_name"),
                    quantity=int(r["quantity"]),
                    unit_price=int(r["unit_price"]),
                    total=int(r["total"]),
                    fulfillment_status=fulfillment,
                    customer_city=r.get("customer_city"),
                    customer_pincode=r.get("customer_pincode"),
                    created_at=r.get("created_at"),
                )
            )
        return items

    async def mark_order_item_packed(self, seller_id: str, order_id: str, item_id: str) -> Dict[str, Any]:
        # Verify item belongs to this seller
        row = (await self.session.execute(
            text("""
                SELECT oi.id, o.id as order_id, o.status 
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                JOIN products p ON p.id = oi.product_id
                WHERE oi.id = :item_id AND (p.seller_id = :sid OR oi.seller_id = :sid)
            """),
            {"item_id": item_id, "sid": seller_id},
        )).fetchone()
        if not row:
            raise DomainException("Order item not found for this seller", code="NOT_FOUND", status_code=404)

        # Update order status to PACKED if not already shipped
        await self.session.execute(
            text("""
                UPDATE orders 
                SET status = 'PACKED', updated_at = NOW() 
                WHERE id = :oid AND status IN ('PENDING', 'CONFIRMED', 'PROCESSING')
            """),
            {"oid": row[1]},
        )
        await self.session.commit()
        return {"status": "PACKED", "item_id": item_id, "order_id": str(row[1])}

    # -------------------------------------------------------------------------
    # Category Suggestion & Admin Approval Workflow
    # -------------------------------------------------------------------------

    async def suggest_category(self, seller_id: str, data: CategorySuggestion) -> Dict[str, Any]:
        import uuid
        formatted_name = _title_case(data.name)
        slug = _slugify(formatted_name)

        # Check existing
        existing = (await self.session.execute(
            text("""
                SELECT id, status FROM categories 
                WHERE lower(trim(name)) = lower(:name) 
                  AND (parent_id = :pid OR (:pid IS NULL AND parent_id IS NULL))
            """),
            {"name": formatted_name, "pid": data.parent_id},
        )).fetchone()

        if existing:
            return {
                "id": str(existing[0]),
                "name": formatted_name,
                "status": existing[1],
                "message": "Category already exists",
            }

        cid = str(uuid.uuid4())
        store_bid = (await self.session.execute(text("SELECT id FROM businesses WHERE name = 'ELEKTRIX' LIMIT 1"))).scalar() or seller_id

        await self.session.execute(text("""
            INSERT INTO categories (id, business_id, name, slug, parent_id, status, requested_by_seller_id)
            VALUES (:id, :bid, :name, :slug, :pid, 'PENDING_APPROVAL', :sid);
        """), {
            "id": cid,
            "bid": store_bid,
            "name": formatted_name,
            "slug": slug,
            "pid": data.parent_id,
            "sid": seller_id,
        })
        await self.session.commit()
        return {
            "id": cid,
            "name": formatted_name,
            "status": "PENDING_APPROVAL",
            "message": "Category submitted for Admin review",
        }

    async def list_pending_categories(self) -> List[CategoryApprovalItem]:
        query = text("""
            SELECT 
                c.id, c.name, c.slug, c.parent_id, 
                pcat.name as parent_name,
                c.requested_by_seller_id,
                s.business_name as seller_name,
                c.status,
                c.created_at
            FROM categories c
            LEFT JOIN categories pcat ON pcat.id = c.parent_id
            LEFT JOIN sellers s ON s.id = c.requested_by_seller_id
            WHERE c.status = 'PENDING_APPROVAL'
            ORDER BY c.created_at DESC;
        """)
        res = await self.session.execute(query)
        rows = res.mappings().all()

        return [
            CategoryApprovalItem(
                id=str(r["id"]),
                name=r["name"],
                slug=r["slug"],
                parent_id=r.get("parent_id"),
                parent_name=r.get("parent_name"),
                requested_by_seller_id=r.get("requested_by_seller_id"),
                seller_name=r.get("seller_name") or "Marketplace Seller",
                status=r["status"],
                created_at=r.get("created_at"),
            )
            for r in rows
        ]

    async def approve_category(self, category_id: str) -> Dict[str, Any]:
        await self.session.execute(
            text("UPDATE categories SET status = 'APPROVED' WHERE id = :cid"),
            {"cid": category_id},
        )
        await self.session.commit()
        return {"status": "APPROVED", "category_id": category_id}

    async def reject_category(self, category_id: str) -> Dict[str, Any]:
        await self.session.execute(
            text("UPDATE categories SET status = 'REJECTED' WHERE id = :cid"),
            {"cid": category_id},
        )
        await self.session.commit()
        return {"status": "REJECTED", "category_id": category_id}

    # -------------------------------------------------------------------------
    # Admin Seller Management
    # -------------------------------------------------------------------------

    async def list_sellers_for_admin(self) -> List[Dict[str, Any]]:
        query = text("""
            SELECT 
                s.id, s.name, s.business_name, s.email, s.phone, s.city, s.pincode,
                s.status, s.rating, s.rating_count, s.commission_rate, s.created_at,
                count(DISTINCT p.id) as product_count,
                count(DISTINCT oi.id) as order_item_count
            FROM sellers s
            LEFT JOIN products p ON p.seller_id = s.id AND p.status != 'ARCHIVED'
            LEFT JOIN order_items oi ON oi.seller_id = s.id OR oi.product_id = p.id
            GROUP BY s.id
            ORDER BY s.created_at DESC;
        """)
        res = await self.session.execute(query)
        rows = res.mappings().all()
        return [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "business_name": r["business_name"],
                "email": r["email"],
                "phone": r.get("phone"),
                "city": r.get("city"),
                "pincode": r.get("pincode"),
                "status": r["status"],
                "rating": float(r["rating"]),
                "rating_count": int(r["rating_count"]),
                "commission_rate": float(r["commission_rate"]),
                "product_count": int(r["product_count"]),
                "order_item_count": int(r["order_item_count"]),
                "created_at": r.get("created_at"),
            }
            for r in rows
        ]

    async def create_seller_by_admin(self, data: SellerCreateAdmin) -> Dict[str, Any]:
        import uuid
        norm_email = data.email.strip().lower()

        # Check existing
        existing = (await self.session.execute(
            select(Seller).where(func.lower(Seller.email) == norm_email)
        )).scalar_one_or_none()
        if existing:
            raise DomainException("A seller with this email already exists", code="EMAIL_TAKEN", status_code=409)

        sid = str(uuid.uuid4())
        seller = Seller(
            id=sid,
            name=data.name.strip(),
            business_name=data.business_name.strip(),
            email=norm_email,
            phone=data.phone,
            city=data.city,
            pincode=data.pincode,
            address=data.address,
            gstin=data.gstin,
            commission_rate=data.commission_rate or 0.0,
            status="ACTIVE",
            rating=4.90,
            rating_count=1,
        )
        self.session.add(seller)

        # Also add to businesses
        slug = _slugify(data.business_name) + f"-{sid[:4]}"
        await self.session.execute(text("""
            INSERT INTO businesses (id, name, slug, is_active, is_seller, contact_email, contact_phone, settings)
            VALUES (:id, :name, :slug, TRUE, TRUE, :email, :phone, :settings)
            ON CONFLICT (id) DO NOTHING;
        """), {
            "id": sid,
            "name": data.business_name.strip(),
            "slug": slug,
            "email": norm_email,
            "phone": data.phone,
            "settings": json.dumps({"city": data.city or ""}),
        })

        await self.session.commit()
        return {
            "id": sid,
            "business_name": seller.business_name,
            "email": seller.email,
            "status": seller.status,
            "message": "Seller profile provisioned successfully. Seller can now sign in using Email OTP.",
        }

    async def update_seller_status(self, seller_id: str, status: str) -> Dict[str, Any]:
        stmt = select(Seller).where(Seller.id == seller_id)
        seller = (await self.session.execute(stmt)).scalar_one_or_none()
        if not seller:
            raise DomainException("Seller not found", code="NOT_FOUND", status_code=404)

        seller.status = status.upper()
        # Also sync business active status
        is_active = seller.status == "ACTIVE"
        await self.session.execute(
            text("UPDATE businesses SET is_active = :act WHERE id = :sid"),
            {"act": is_active, "sid": seller_id},
        )
        await self.session.commit()
        return {"id": seller_id, "status": seller.status}
