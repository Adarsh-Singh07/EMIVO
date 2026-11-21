import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from passlib.hash import argon2
from jose import jwt
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.ai_gateway import AIGateway
from core.config import settings
from core.database import async_session_maker
from core.exceptions import DomainException
from core.redis import redis_manager
from modules.sellers.models import Seller, CatalogDuplicateCandidate
from modules.sellers.schemas import (
    CategoryApprovalItem,
    CategorySuggestion,
    DuplicateCandidateItem,
    SellerAttachOffer,
    SellerCreateAdmin,
    SellerOrderItem,
    SellerProductCreate,
    SellerProductItem,
    SellerProductUpdate,
    SellerProfileUpdate,
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

    async def login_with_password(self, email: str, password: str) -> Dict[str, Any]:
        norm_email = email.strip().lower()

        # 1. Look up seller
        stmt = select(Seller).where(func.lower(Seller.email) == norm_email)
        seller = (await self.session.execute(stmt)).scalar_one_or_none()
        if not seller:
            raise DomainException("Invalid email or password", code="INVALID_CREDENTIALS", status_code=401)

        # 2. Check seller password_hash
        pwd_hash = seller.password_hash
        if not pwd_hash:
            # Check if this email has a password_hash in users table (e.g. admin user)
            u_row = (await self.session.execute(
                text("SELECT password_hash FROM users WHERE lower(email) = :email"),
                {"email": norm_email},
            )).fetchone()
            if u_row and u_row[0]:
                pwd_hash = u_row[0]
                await self.session.execute(
                    text("UPDATE sellers SET password_hash = :hash WHERE id = :sid"),
                    {"hash": pwd_hash, "sid": seller.id},
                )
                await self.session.commit()

        if not pwd_hash or not argon2.verify(password, pwd_hash):
            raise DomainException("Invalid email or password", code="INVALID_CREDENTIALS", status_code=401)

        if seller.status == "SUSPENDED":
            raise DomainException("Seller account is suspended. Please contact admin.", code="SUSPENDED", status_code=403)

        # 3. Check if user is also platform_admin
        u_roles_row = (await self.session.execute(
            text("""
                SELECT array_agg(r.name) 
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                JOIN users u ON u.id = ur.user_id
                WHERE lower(u.email) = :email
            """),
            {"email": norm_email},
        )).fetchone()
        u_roles = u_roles_row[0] if (u_roles_row and u_roles_row[0]) else []
        roles = ["seller"]
        if "platform_admin" in u_roles or "owner" in u_roles or norm_email == "admin@elektrix.in":
            roles.append("platform_admin")

        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiration_minutes)
        to_encode = {
            "exp": expire,
            "sub": str(seller.id),
            "seller_id": str(seller.id),
            "business_id": str(seller.id),
            "roles": roles,
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

    async def update_profile(self, seller_id: str, data: SellerProfileUpdate) -> Dict[str, Any]:
        stmt = select(Seller).where(Seller.id == seller_id)
        seller = (await self.session.execute(stmt)).scalar_one_or_none()
        if not seller:
            raise DomainException("Seller not found", code="NOT_FOUND", status_code=404)

        if data.name is not None: seller.name = data.name.strip()
        if data.business_name is not None: seller.business_name = data.business_name.strip()
        if data.contact_person is not None: seller.contact_person = data.contact_person.strip()
        if data.phone is not None: seller.phone = data.phone.strip()
        if data.address is not None: seller.address = data.address.strip()
        if data.address_line2 is not None: seller.address_line2 = data.address_line2.strip()
        if data.city is not None: seller.city = data.city.strip()
        if data.state is not None: seller.state = data.state.strip()
        if data.pincode is not None: seller.pincode = data.pincode.strip()
        if data.gstin is not None: seller.gstin = data.gstin.strip().upper()

        # Also sync business record
        await self.session.execute(text("""
            UPDATE businesses 
            SET name = coalesce(:bname, name),
                contact_phone = coalesce(:phone, contact_phone),
                settings = jsonb_set(
                    coalesce(settings, '{}'::jsonb), 
                    '{city}', 
                    to_jsonb(:city::text)
                )
            WHERE id = :sid
        """), {
            "bname": data.business_name,
            "phone": data.phone,
            "city": data.city or "",
            "sid": seller_id,
        })

        await self.session.commit()
        return {
            "id": str(seller.id),
            "name": seller.name,
            "business_name": seller.business_name,
            "contact_person": seller.contact_person,
            "email": seller.email,
            "phone": seller.phone,
            "address": seller.address,
            "address_line2": seller.address_line2,
            "city": seller.city,
            "state": seller.state,
            "pincode": seller.pincode,
            "gstin": seller.gstin,
            "status": seller.status,
            "rating": float(seller.rating),
            "rating_count": seller.rating_count,
        }

    async def change_password(self, seller_id: str, current_password: str, new_password: str) -> Dict[str, Any]:
        stmt = select(Seller).where(Seller.id == seller_id)
        seller = (await self.session.execute(stmt)).scalar_one_or_none()
        if not seller:
            raise DomainException("Seller not found", code="NOT_FOUND", status_code=404)

        if not seller.password_hash or not argon2.verify(current_password, seller.password_hash):
            raise DomainException("Current password is incorrect", code="INVALID_PASSWORD", status_code=400)

        if len(new_password) < 6:
            raise DomainException("New password must be at least 6 characters", code="WEAK_PASSWORD", status_code=400)

        seller.password_hash = argon2.hash(new_password)
        await self.session.execute(text("""
            UPDATE users SET password_hash = :hash WHERE lower(email) = lower(:email)
        """), {"hash": seller.password_hash, "email": seller.email})

        await self.session.commit()
        return {"status": "success", "message": "Password changed successfully"}

    # -------------------------------------------------------------------------
    # Seller Products & Inventory
    # -------------------------------------------------------------------------

    async def list_seller_products(self, seller_id: str) -> List[SellerProductItem]:
        query = text("""
            SELECT 
                p.id, p.name, p.slug, p.sku, p.brand, p.price, p.mrp, p.sale_price,
                coalesce(sl.stock, i.on_hand, 0) as stock,
                p.status, p.category_id, p.description, p.warranty_info, p.return_policy, p.specs,
                c.name as category_name,
                pcat.name as parent_category_name,
                p.created_at
            FROM products p
            LEFT JOIN seller_listings sl ON sl.product_id = p.id AND sl.seller_id = :sid
            LEFT JOIN inventory i ON i.product_id = p.id
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN categories pcat ON pcat.id = c.parent_id
            WHERE (p.seller_id = :sid OR sl.seller_id = :sid) AND p.status != 'ARCHIVED'
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
                    description=r.get("description"),
                    warranty_info=r.get("warranty_info"),
                    return_policy=r.get("return_policy"),
                    specs=r.get("specs") or [],
                    images=img_map.get(r["id"], []),
                    created_at=r.get("created_at"),
                )
            )
        return items

    async def get_seller_product(self, seller_id: str, product_id: str) -> Dict[str, Any]:
        query = text("""
            SELECT 
                p.id, p.name, p.slug, p.sku, p.brand, p.price, p.mrp, p.sale_price,
                coalesce(sl.stock, i.on_hand, 0) as stock,
                p.status, p.category_id, p.description, p.warranty_info, p.return_policy, p.specs,
                c.name as category_name,
                c.parent_id as parent_category_id,
                pcat.name as parent_category_name
            FROM products p
            LEFT JOIN seller_listings sl ON sl.product_id = p.id AND sl.seller_id = :sid
            LEFT JOIN inventory i ON i.product_id = p.id
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN categories pcat ON pcat.id = c.parent_id
            WHERE p.id = :pid AND (p.seller_id = :sid OR sl.seller_id = :sid);
        """)
        res = await self.session.execute(query, {"pid": product_id, "sid": seller_id})
        row = res.mappings().one_or_none()
        if not row:
            raise DomainException("Product not found or access denied", code="NOT_FOUND", status_code=404)

        img_res = await self.session.execute(
            text("SELECT media_url FROM product_media WHERE product_id = :pid ORDER BY position ASC"),
            {"pid": product_id},
        )
        images = [img[0] for img in img_res]

        return {
            "id": str(row["id"]),
            "name": row["name"],
            "slug": row.get("slug"),
            "sku": row.get("sku"),
            "brand": row.get("brand"),
            "price": int(row["price"]),
            "mrp": row.get("mrp"),
            "sale_price": row.get("sale_price"),
            "stock": int(row["stock"]),
            "status": str(row["status"]),
            "category_id": row.get("category_id"),
            "parent_category_id": row.get("parent_category_id"),
            "category_name": row.get("category_name"),
            "parent_category_name": row.get("parent_category_name"),
            "description": row.get("description"),
            "warranty_info": row.get("warranty_info"),
            "return_policy": row.get("return_policy"),
            "specs": row.get("specs") or [],
            "images": images,
        }

    async def search_catalog(self, query: str, brand: Optional[str] = None) -> List[Dict[str, Any]]:
        sql = """
            SELECT 
                p.id, p.name, p.brand, p.category_id, p.price, p.mrp,
                c.name as category_name,
                (SELECT media_url FROM product_media WHERE product_id = p.id ORDER BY position ASC LIMIT 1) as primary_image,
                (SELECT min(price) FROM seller_listings WHERE product_id = p.id AND is_active = TRUE) as lowest_offer_price,
                (SELECT count(*) FROM seller_listings WHERE product_id = p.id AND is_active = TRUE) as seller_count
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.status = 'ACTIVE'
        """
        params: Dict[str, Any] = {}
        if brand and brand.strip():
            sql += " AND lower(p.brand) = lower(:brand)"
            params["brand"] = brand.strip()

        if query and query.strip():
            sql += " AND (lower(p.name) LIKE :q OR lower(p.brand) LIKE :q OR lower(c.name) LIKE :q)"
            params["q"] = f"%{query.strip().lower()}%"

        sql += " ORDER BY p.created_at DESC LIMIT 20;"

        res = await self.session.execute(text(sql), params)
        rows = res.mappings().all()
        return [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "brand": r.get("brand"),
                "category_id": r.get("category_id"),
                "category_name": r.get("category_name"),
                "price": int(r["price"]),
                "mrp": r.get("mrp"),
                "image": r.get("primary_image"),
                "lowest_offer_price": r.get("lowest_offer_price") or int(r["price"]),
                "seller_count": int(r.get("seller_count") or 1),
            }
            for r in rows
        ]

    async def attach_seller_offer(self, seller_id: str, data: SellerAttachOffer) -> Dict[str, Any]:
        import uuid
        prod = (await self.session.execute(
            text("SELECT id, name, price, mrp FROM products WHERE id = :pid AND status != 'ARCHIVED'"),
            {"pid": data.product_id},
        )).fetchone()
        if not prod:
            raise DomainException("Product not found in catalog", code="NOT_FOUND", status_code=404)

        price_paise = data.price * 100 if data.price < 500000 else data.price
        mrp_paise = (data.mrp * 100) if (data.mrp and data.mrp < 500000) else (data.mrp or price_paise)

        lid = str(uuid.uuid4())
        await self.session.execute(text("""
            INSERT INTO seller_listings (
                id, product_id, seller_id, sku, price, mrp, stock, is_active,
                condition, estimated_delivery_days, rating, rating_count
            )
            VALUES (:id, :pid, :sid, :sku, :price, :mrp, :stock, TRUE, :cond, :days, 4.90, 1)
            ON CONFLICT (seller_id, product_id) DO UPDATE SET
                price = EXCLUDED.price,
                mrp = EXCLUDED.mrp,
                stock = EXCLUDED.stock,
                condition = EXCLUDED.condition,
                estimated_delivery_days = EXCLUDED.estimated_delivery_days,
                is_active = TRUE,
                updated_at = NOW();
        """), {
            "id": lid,
            "pid": data.product_id,
            "sid": seller_id,
            "sku": data.sku or f"SKU-{data.product_id[:8].upper()}",
            "price": price_paise,
            "mrp": mrp_paise,
            "stock": data.stock,
            "cond": data.condition or "NEW",
            "days": data.estimated_delivery_days or 3,
        })
        await self.session.commit()
        return {"status": "success", "message": f"Added offer for '{prod[1]}' to your inventory!"}

    async def create_seller_product(self, seller_id: str, data: SellerProductCreate) -> Dict[str, Any]:
        import uuid
        from modules.products.models import Product, ProductMedia
        from modules.inventory.models import Inventory

        # Ensure business_id is set (use Apana Enterprises business or store business id)
        store_bid = (await self.session.execute(text("SELECT id FROM businesses WHERE name = 'ELEKTRIX' LIMIT 1"))).scalar() or seller_id

        pid = str(uuid.uuid4())
        slug = _slugify(data.name) + f"-{pid[:6]}"
        price_paise = data.price * 100 if data.price < 500000 else data.price
        mrp_paise = (data.mrp * 100) if (data.mrp and data.mrp < 500000) else (data.mrp or price_paise)

        # Auto-create brand if brand is provided and not existing in brands
        if data.brand and data.brand.strip():
            b_name = data.brand.strip()
            b_slug = _slugify(b_name)
            await self.session.execute(text("""
                INSERT INTO brands (id, business_id, name, slug)
                VALUES (:id, :bid, :name, :slug)
                ON CONFLICT (id) DO NOTHING;
            """), {"id": str(uuid.uuid4()), "bid": store_bid, "name": b_name, "slug": b_slug})

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
            warranty_info=data.warranty_info,
            return_policy=data.return_policy,
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
        import uuid
        from modules.products.models import ProductMedia

        # Verify ownership or permission
        row = (await self.session.execute(
            text("SELECT id FROM products WHERE id = :pid AND (seller_id = :sid OR :sid IN (SELECT id FROM sellers WHERE email = 'admin@elektrix.in'))"),
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
        if data.brand is not None:
            updates.append("brand = :brand")
            params["brand"] = data.brand.strip()
        if data.category_id is not None:
            updates.append("category_id = :category_id")
            params["category_id"] = data.category_id
        if data.description is not None:
            updates.append("description = :description")
            params["description"] = data.description
        if data.warranty_info is not None:
            updates.append("warranty_info = :warranty_info")
            params["warranty_info"] = data.warranty_info
        if data.return_policy is not None:
            updates.append("return_policy = :return_policy")
            params["return_policy"] = data.return_policy
        if data.specs is not None:
            updates.append("specs = :specs::jsonb")
            params["specs"] = json.dumps(data.specs)

        if updates:
            sql = f"UPDATE products SET {', '.join(updates)}, updated_at = NOW() WHERE id = :pid"
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

        # Update images if provided
        if data.images is not None:
            await self.session.execute(
                text("DELETE FROM product_media WHERE product_id = :pid"),
                {"pid": product_id},
            )
            for idx, img_url in enumerate(data.images):
                if img_url and img_url.strip():
                    self.session.add(
                        ProductMedia(
                            id=str(uuid.uuid4()),
                            product_id=product_id,
                            media_url=img_url.strip(),
                            position=idx,
                        )
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
                coalesce(oi.seller_name, s.business_name, 'Apana Enterprises') as seller_name,
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
                c.status
            FROM categories c
            LEFT JOIN categories pcat ON pcat.id = c.parent_id
            LEFT JOIN sellers s ON s.id = c.requested_by_seller_id
            WHERE c.status = 'PENDING_APPROVAL'
            ORDER BY c.position ASC, c.name ASC;
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
                created_at=None,
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

    # -------------------------------------------------------------------------
    # Catalog Deduplication & Admin Governance (12:00 AM Cron & Review)
    # -------------------------------------------------------------------------

    async def list_duplicate_candidates(self) -> List[DuplicateCandidateItem]:
        query = text("""
            SELECT 
                c.id, c.product_a_id, c.product_b_id, c.suggested_master_id,
                c.similarity_score, c.confidence_score, c.ai_reason, c.suggested_clean_title,
                c.status, c.detected_at,
                pa.name as pa_name, pa.brand as pa_brand, pa.price as pa_price,
                coalesce(sa.business_name, 'Apana Enterprises') as pa_seller_name,
                (SELECT media_url FROM product_media WHERE product_id = pa.id ORDER BY position ASC LIMIT 1) as pa_image,
                pb.name as pb_name, pb.brand as pb_brand, pb.price as pb_price,
                coalesce(sb.business_name, 'Apana Enterprises') as pb_seller_name,
                (SELECT media_url FROM product_media WHERE product_id = pb.id ORDER BY position ASC LIMIT 1) as pb_image
            FROM catalog_duplicate_candidates c
            JOIN products pa ON pa.id = c.product_a_id
            JOIN products pb ON pb.id = c.product_b_id
            LEFT JOIN sellers sa ON sa.id = pa.seller_id
            LEFT JOIN sellers sb ON sb.id = pb.seller_id
            WHERE c.status = 'PENDING_REVIEW'
            ORDER BY c.confidence_score DESC, c.detected_at DESC;
        """)
        res = await self.session.execute(query)
        rows = res.mappings().all()
        return [
            DuplicateCandidateItem(
                id=str(r["id"]),
                product_a_id=str(r["product_a_id"]),
                product_a_name=r["pa_name"],
                product_a_brand=r.get("pa_brand"),
                product_a_price=int(r["pa_price"]),
                product_a_seller_name=r.get("pa_seller_name"),
                product_a_image=r.get("pa_image"),
                product_b_id=str(r["product_b_id"]),
                product_b_name=r["pb_name"],
                product_b_brand=r.get("pb_brand"),
                product_b_price=int(r["pb_price"]),
                product_b_seller_name=r.get("pb_seller_name"),
                product_b_image=r.get("pb_image"),
                suggested_master_id=r.get("suggested_master_id"),
                similarity_score=int(r["similarity_score"]),
                confidence_score=int(r["confidence_score"]),
                ai_reason=r.get("ai_reason"),
                suggested_clean_title=r.get("suggested_clean_title"),
                status=r["status"],
                detected_at=r.get("detected_at"),
            )
            for r in rows
        ]

    async def merge_duplicate_products(self, candidate_id: str, master_product_id: str, clean_title: Optional[str] = None) -> Dict[str, Any]:
        cand = (await self.session.execute(
            text("SELECT product_a_id, product_b_id FROM catalog_duplicate_candidates WHERE id = :id"),
            {"id": candidate_id},
        )).fetchone()
        if not cand:
            raise DomainException("Duplicate candidate not found", code="NOT_FOUND", status_code=404)

        p_a, p_b = str(cand[0]), str(cand[1])
        if master_product_id == p_a:
            dup_id = p_b
        else:
            master_product_id = p_b
            dup_id = p_a

        # 1. Transfer seller_listings from dup_id to master_product_id
        await self.session.execute(text("""
            INSERT INTO seller_listings (
                id, product_id, seller_id, sku, price, mrp, stock, is_active,
                condition, estimated_delivery_days, rating, rating_count
            )
            SELECT 
                gen_random_uuid()::text, :master_id, seller_id, sku, price, mrp, stock, is_active,
                condition, estimated_delivery_days, rating, rating_count
            FROM seller_listings
            WHERE product_id = :dup_id
            ON CONFLICT (seller_id, product_id) DO UPDATE SET
                stock = seller_listings.stock + EXCLUDED.stock,
                price = LEAST(seller_listings.price, EXCLUDED.price),
                updated_at = NOW();
        """), {"master_id": master_product_id, "dup_id": dup_id})

        # 2. Update order_items to point to master_product_id while keeping historical record
        await self.session.execute(text("""
            UPDATE order_items SET product_id = :master_id WHERE product_id = :dup_id
        """), {"master_id": master_product_id, "dup_id": dup_id})

        # 3. Mark duplicate product as ARCHIVED
        await self.session.execute(text("""
            UPDATE products SET status = 'ARCHIVED', updated_at = NOW() WHERE id = :dup_id
        """), {"dup_id": dup_id})

        # 4. If clean_title provided, update master product title
        if clean_title and clean_title.strip():
            await self.session.execute(text("""
                UPDATE products SET name = :title, updated_at = NOW() WHERE id = :master_id
            """), {"title": clean_title.strip(), "master_id": master_product_id})

        # 5. Mark candidate record as MERGED
        await self.session.execute(text("""
            UPDATE catalog_duplicate_candidates 
            SET status = 'MERGED', reviewed_at = NOW(), reviewed_by = 'admin'
            WHERE id = :cid
        """), {"cid": candidate_id})

        await self.session.commit()
        return {"status": "MERGED", "master_product_id": master_product_id, "merged_product_id": dup_id}

    async def dismiss_duplicate(self, candidate_id: str) -> Dict[str, Any]:
        await self.session.execute(text("""
            UPDATE catalog_duplicate_candidates 
            SET status = 'DISMISSED', reviewed_at = NOW(), reviewed_by = 'admin'
            WHERE id = :cid
        """), {"cid": candidate_id})
        await self.session.commit()
        return {"status": "DISMISSED", "candidate_id": candidate_id}

    async def run_ai_catalog_deduplication(self) -> Dict[str, Any]:
        """Scans catalog products, finds candidate duplicate pairs, evaluates
        with Gemini/100MillionSeek AI, and saves to catalog_duplicate_candidates."""
        import uuid

        query = text("""
            SELECT 
                p.id, p.name, p.brand, p.category_id, p.price, p.created_at,
                c.name as category_name,
                count(oi.id) as order_count
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN order_items oi ON oi.product_id = p.id
            WHERE p.status = 'ACTIVE'
            GROUP BY p.id, p.name, p.brand, p.category_id, p.price, p.created_at, c.name
            ORDER BY p.created_at DESC
            LIMIT 100;
        """)
        res = await self.session.execute(query)
        prods = [dict(r) for r in res.mappings().all()]

        candidates_found = 0

        # Pairwise comparison
        for i in range(len(prods)):
            for j in range(i + 1, len(prods)):
                p1 = prods[i]
                p2 = prods[j]

                # Check if pair is already in candidates table
                exists = (await self.session.execute(
                    text("""
                        SELECT id FROM catalog_duplicate_candidates
                        WHERE (product_a_id = :p1 AND product_b_id = :p2)
                           OR (product_a_id = :p2 AND product_b_id = :p1)
                    """),
                    {"p1": str(p1["id"]), "p2": str(p2["id"])},
                )).fetchone()
                if exists:
                    continue

                # Heuristic filter: token overlap or brand match
                name1_words = set(re.findall(r"\w+", p1["name"].lower()))
                name2_words = set(re.findall(r"\w+", p2["name"].lower()))
                overlap = len(name1_words & name2_words) / max(len(name1_words | name2_words), 1)

                same_brand = bool(p1.get("brand") and p2.get("brand") and p1["brand"].lower() == p2["brand"].lower())

                if overlap >= 0.40 or (same_brand and overlap >= 0.25):
                    # Invoke AI Gateway to analyze
                    eval_res = await AIGateway.detect_duplicate_pair(
                        {
                            "id": str(p1["id"]),
                            "name": p1["name"],
                            "brand": p1.get("brand"),
                            "category_name": p1.get("category_name"),
                            "price_rupees": p1["price"] // 100 if p1["price"] > 10000 else p1["price"],
                            "order_count": p1.get("order_count") or 0,
                        },
                        {
                            "id": str(p2["id"]),
                            "name": p2["name"],
                            "brand": p2.get("brand"),
                            "category_name": p2.get("category_name"),
                            "price_rupees": p2["price"] // 100 if p2["price"] > 10000 else p2["price"],
                            "order_count": p2.get("order_count") or 0,
                        },
                    )

                    if eval_res.get("is_duplicate") and eval_res.get("confidence_score", 0) >= 70:
                        cid = str(uuid.uuid4())
                        await self.session.execute(text("""
                            INSERT INTO catalog_duplicate_candidates (
                                id, product_a_id, product_b_id, suggested_master_id,
                                similarity_score, confidence_score, ai_reason, suggested_clean_title,
                                status, detected_at
                            )
                            VALUES (
                                :id, :pa, :pb, :master, :sim, :conf, :reason, :title, 'PENDING_REVIEW', NOW()
                            );
                        """), {
                            "id": cid,
                            "pa": str(p1["id"]),
                            "pb": str(p2["id"]),
                            "master": eval_res.get("suggested_master_id"),
                            "sim": int(overlap * 100),
                            "conf": eval_res.get("confidence_score", 85),
                            "reason": eval_res.get("reason"),
                            "title": eval_res.get("suggested_clean_title"),
                        })
                        candidates_found += 1

        await self.session.commit()
        return {"status": "success", "new_duplicates_detected": candidates_found}
