"""Storefront catalog service — SQL-driven public catalog for the canonical
store tenant, with server-computed effective pricing and live stock.

Effective price rule (single source of truth for every price a customer sees):
  sale_price when an offer window is active, else price.
GST-inclusive pricing: no tax line is added at checkout.
"""
import math
from typing import List, Optional, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from modules.storefront.schemas import (
    SearchSuggestion,
    StockInfo,
    StoreCategory,
    StoreProduct,
    StoreProductList,
    StoreVariant,
)

# Effective price as a SQL expression (used in SELECT, ORDER BY and filters)
EFFECTIVE_PRICE_SQL = (
    "CASE WHEN p.sale_price IS NOT NULL AND p.sale_price > 0 "
    "AND (p.offer_starts_at IS NULL OR p.offer_starts_at <= now()) "
    "AND (p.offer_ends_at IS NULL OR p.offer_ends_at >= now()) "
    "THEN p.sale_price ELSE p.price END"
)


class CatalogService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _store_business_id(self) -> str:
        res = await self.session.execute(
            text("SELECT NULLIF(current_setting('app.business_id', true), '')")
        )
        return str(res.scalar())

    @staticmethod
    def _product_row_to_model(row, images: Sequence[str] = (), stock=None) -> StoreProduct:
        d = dict(row)
        effective = d["effective_price"]
        mrp = d.get("mrp") or d["price"]
        discount = int(round((mrp - effective) / mrp * 100)) if mrp > 0 else 0
        return StoreProduct(
            id=d["id"],
            name=d["name"],
            slug=d.get("slug"),
            description=d.get("description"),
            brand=d.get("brand"),
            return_policy=d.get("return_policy"),
            warranty_info=d.get("warranty_info"),
            sku=d.get("sku"),
            category_id=d.get("category_id"),
            category_name=d.get("category_name"),
            category_slug=d.get("category_slug"),
            price=d["price"],
            mrp=d.get("mrp"),
            effective_price=effective,
            discount_percent=max(discount, 0),
            on_offer=effective < d["price"],
            offer_name=d.get("offer_name"),
            is_flash_sale=bool(d.get("is_flash_sale")),
            offer_ends_at=d.get("offer_ends_at"),
            status=str(d.get("status") or "ACTIVE"),
            featured=bool(d.get("featured")),
            specs=d.get("specs"),
            tags=d.get("tags"),
            images=list(images),
            variants=[
                {"id": v["id"], "name": v["name"], "sku": v.get("sku"), "price": v["price"]}
                for v in (d.get("variants") or [])
            ],
            stock=stock,
            rating_avg=d.get("rating_avg"),
            rating_count=int(d.get("rating_count") or 0),
            created_at=d.get("created_at"),
        )

    async def _load_images(self, product_ids: List[str]) -> dict:
        if not product_ids:
            return {}
        res = await self.session.execute(
            text("""
                SELECT product_id, media_url FROM product_media
                WHERE product_id = ANY(:ids) ORDER BY position ASC
            """),
            {"ids": product_ids},
        )
        out: dict = {}
        for pid, url in res:
            out.setdefault(pid, []).append(url)
        return out

    async def _load_stock(self, product_ids: List[str]) -> dict:
        if not product_ids:
            return {}
        res = await self.session.execute(
            text("""
                SELECT product_id, on_hand, reserved FROM inventory
                WHERE product_id = ANY(:ids)
            """),
            {"ids": product_ids},
        )
        return {
            pid: StockInfo(
                on_hand=on_hand, reserved=reserved,
                available=on_hand - reserved, in_stock=(on_hand - reserved) > 0,
            )
            for pid, on_hand, reserved in res
        }

    async def _load_variants(self, product_ids: List[str]) -> dict:
        if not product_ids:
            return {}
        res = await self.session.execute(
            text("""
                SELECT id, product_id, name, sku, price FROM product_variants
                WHERE product_id = ANY(:ids) ORDER BY price ASC
            """),
            {"ids": product_ids},
        )
        out: dict = {}
        for vid, pid, name, sku, price in res:
            out.setdefault(pid, []).append(
                {"id": vid, "name": name, "sku": sku, "price": price}
            )
        return out

    _BASE_SELECT = f"""
        SELECT p.id, p.name, p.slug, p.description, p.brand, p.return_policy, p.warranty_info, p.sku, p.price, p.mrp,
               p.sale_price, p.offer_name, p.status, p.featured, p.specs, p.tags, p.category_id,
               p.is_flash_sale, p.offer_ends_at,
               p.created_at, c.name AS category_name, c.slug AS category_slug,
               {EFFECTIVE_PRICE_SQL} AS effective_price,
               rr.rating_avg AS rating_avg, rr.rating_count AS rating_count
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN LATERAL (
            SELECT ROUND(AVG(rating)::numeric, 2)::float AS rating_avg, COUNT(*) AS rating_count
            FROM product_reviews WHERE product_id = p.id
        ) rr ON true
    """

    async def list_products(
        self,
        q: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        featured_only: bool = False,
        in_stock_only: bool = False,
        sort: str = "relevance",
        page: int = 1,
        page_size: int = 24,
    ) -> StoreProductList:
        store_id = await self._store_business_id()
        filters = ["p.business_id = :bid", "p.status = 'ACTIVE'"]
        params: dict = {"bid": store_id, "lim": page_size, "off": (page - 1) * page_size}

        if category:
            # match the category itself or any of its children (parents are
            # navigation nodes; products attach to leaf categories)
            filters.append(
                """(c.slug = :cat OR c.id::text = :cat OR c.parent_id IN (SELECT id FROM categories WHERE slug = :cat) OR (p.tags IS NOT NULL AND p.tags::text ILIKE :cat_tag))"""
            )
            params["cat"] = category
            params["cat_tag"] = f'%"{category}"%'
        if brand:
            filters.append("p.brand ILIKE :brand")
            params["brand"] = f"%{brand}%"
        if min_price is not None:
            filters.append(f"{EFFECTIVE_PRICE_SQL} >= :minp")
            params["minp"] = min_price
        if max_price is not None:
            filters.append(f"{EFFECTIVE_PRICE_SQL} <= :maxp")
            params["maxp"] = max_price
        if featured_only:
            filters.append("p.featured = true")
        if in_stock_only:
            filters.append(
                "EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id AND i.on_hand - i.reserved > 0)"
            )
        if q:
            terms = [t.strip() for t in q.split() if t.strip()]
            if terms:
                term_filters = []
                for i, t in enumerate(terms):
                    params[f"q_{i}"] = f"%{t}%"
                    term_filters.append(
                        f"(p.name ILIKE :q_{i} OR p.brand ILIKE :q_{i} OR p.sku ILIKE :q_{i} OR p.description ILIKE :q_{i} OR c.name ILIKE :q_{i} OR c.keywords ILIKE :q_{i} OR p.tags::text ILIKE :q_{i})"
                    )
                filters.append("(" + " AND ".join(term_filters) + ")")

        order = {
            "price_asc": f"{EFFECTIVE_PRICE_SQL} ASC",
            "price_desc": f"{EFFECTIVE_PRICE_SQL} DESC",
            "newest": "p.created_at DESC",
            "name": "p.name ASC",
            "discount": f"((COALESCE(p.mrp, p.price) - {EFFECTIVE_PRICE_SQL})::float / COALESCE(p.mrp, p.price)) DESC",
            "relevance": "p.featured DESC, p.created_at DESC",
        }.get(sort, "p.featured DESC, p.created_at DESC")

        where = " AND ".join(filters)
        rows = (
            await self.session.execute(
                text(f"{self._BASE_SELECT} WHERE {where} ORDER BY {order} LIMIT :lim OFFSET :off"),
                params,
            )
        ).mappings().all()
        total = (
            await self.session.execute(
                text(f"SELECT count(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE {where}"),
                params,
            )
        ).scalar()

        ids = [r["id"] for r in rows]
        images = await self._load_images(ids)
        stocks = await self._load_stock(ids)
        variants = await self._load_variants(ids)
        items = []
        for r in rows:
            m = self._product_row_to_model(r, images.get(r["id"], []), stocks.get(r["id"]))
            m.variants = [StoreVariant(**v) for v in variants.get(r["id"], [])]
            items.append(m)

        return StoreProductList(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
            has_prev=page > 1,
        )

    async def get_product(self, identifier: str) -> Optional[StoreProduct]:
        """Fetch by slug or UUID."""
        store_id = await self._store_business_id()
        row = (
            await self.session.execute(
                text(f"{self._BASE_SELECT} WHERE p.business_id = :bid AND p.status = 'ACTIVE' "
                     "AND (p.slug = :ident OR p.id::text = :ident)"),
                {"bid": store_id, "ident": identifier},
            )
        ).mappings().first()
        if not row:
            return None
        images = await self._load_images([row["id"]])
        stock = (await self._load_stock([row["id"]])).get(row["id"])
        variants = await self._load_variants([row["id"]])
        m = self._product_row_to_model(row, images.get(row["id"], []), stock)
        m.variants = [StoreVariant(**v) for v in variants.get(row["id"], [])]
        return m

    async def related_products(self, product_id: str, limit: int = 8) -> List[StoreProduct]:
        store_id = await self._store_business_id()
        rows = (
            await self.session.execute(
                text(f"""
                    {self._BASE_SELECT}
                    WHERE p.business_id = :bid AND p.status = 'ACTIVE' AND p.id != :pid
                      AND (p.category_id = (SELECT category_id FROM products WHERE id = :pid)
                           OR p.brand = (SELECT brand FROM products WHERE id = :pid))
                    ORDER BY p.featured DESC, p.created_at DESC
                    LIMIT :lim
                """),
                {"bid": store_id, "pid": product_id, "lim": limit},
            )
        ).mappings().all()
        ids = [r["id"] for r in rows]
        images = await self._load_images(ids)
        stocks = await self._load_stock(ids)
        return [self._product_row_to_model(r, images.get(r["id"], []), stocks.get(r["id"])) for r in rows]

    async def products_by_ids(self, ids: List[str]) -> List[StoreProduct]:
        if not ids:
            return []
        store_id = await self._store_business_id()
        rows = (
            await self.session.execute(
                text(f"{self._BASE_SELECT} WHERE p.business_id = :bid AND p.id::text = ANY(:ids)"),
                {"bid": store_id, "ids": ids},
            )
        ).mappings().all()
        images = await self._load_images(ids)
        stocks = await self._load_stock(ids)
        return [self._product_row_to_model(r, images.get(r["id"], []), stocks.get(r["id"])) for r in rows]

    async def categories(self) -> List[StoreCategory]:
        store_id = await self._store_business_id()
        rows = (
            await self.session.execute(
                text("""
                    SELECT c.id, c.name, c.slug, c.parent_id, c.image_url, c.icon, c.keywords,
                           (SELECT count(*) FROM products p
                            WHERE p.category_id = c.id AND p.status = 'ACTIVE') AS product_count
                    FROM categories c WHERE c.business_id = :bid
                    ORDER BY c.position ASC, c.name ASC
                """),
                {"bid": store_id},
            )
        ).mappings().all()
        nodes = {
            r["id"]: StoreCategory(
                id=r["id"], name=r["name"], slug=r["slug"],
                parent_id=r["parent_id"], product_count=r["product_count"], image_url=r.get("image_url"), icon=r.get("icon"), keywords=r.get("keywords"),
            )
            for r in rows
        }
        roots: List[StoreCategory] = []
        for node in nodes.values():
            if node.parent_id and node.parent_id in nodes:
                nodes[node.parent_id].children.append(node)
            else:
                roots.append(node)
        return roots

    async def brands(self, category: Optional[str] = None) -> List[dict]:
        """Brand facet. Scoped to a category tree when `category` (slug/id) is
        given; product_count always computed live from ACTIVE products."""
        store_id = await self._store_business_id()
        scope = ""
        params: dict = {"bid": store_id}
        if category:
            params["cat"] = category
            # products in this category or any of its children (parents are navigation nodes)
            scope = """
                AND p.category_id IN (
                    SELECT c2.id FROM categories c2
                    WHERE c2.business_id = :bid
                      AND (c2.slug = :cat OR c2.id::text = :cat
                           OR c2.parent_id IN (
                               SELECT c3.id FROM categories c3
                               WHERE c3.business_id = :bid
                                 AND (c3.slug = :cat OR c3.id::text = :cat)))
                )
            """
        res = await self.session.execute(
            text(f"""
                SELECT s.brand AS name,
                       b.slug,
                       b.logo_url,
                       s.product_count
                FROM (
                    SELECT p.brand, COUNT(*) AS product_count
                    FROM products p
                    WHERE p.business_id = :bid
                      AND p.status = 'ACTIVE'
                      AND p.brand IS NOT NULL AND p.brand <> ''
                      {scope}
                    GROUP BY p.brand
                ) s
                LEFT JOIN brands b
                    ON b.business_id = :bid AND b.name = s.brand
                ORDER BY s.product_count DESC, s.brand ASC
            """),
            params,
        )
        out = []
        for r in res.mappings():
            if (r["name"] or "").strip():
                out.append({
                    "name": r["name"],
                    "slug": r["slug"],
                    "logo_url": r["logo_url"],
                    "product_count": r["product_count"],
                })
        return out

    # Round-number rupee thresholds (in paise) used to build price buckets.
    _BUCKET_THRESHOLDS = [
        100_000, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000,
        5_000_000, 7_500_000, 10_000_000, 15_000_000, 20_000_000, 30_000_000, 50_000_000,
    ]

    @classmethod
    def _rupee(cls, paise: int) -> str:
        rupees = paise / 100
        if rupees >= 100_000:
            return f"₹{rupees / 100_000:.1f}L".replace(".0L", "L")
        if rupees >= 1000:
            return f"₹{rupees / 1000:.1f}k".replace(".0k", "k")
        return f"₹{int(rupees)}"

    async def _price_buckets(self, store_id: str, category_ids_sql: str, params: dict) -> list:
        """Auto 'by Price' buckets from live prices: count products in each
        round-number range, drop empties, label the bounds."""
        rows = (
            await self.session.execute(
                text(f"""
                    SELECT eff.br AS price FROM (
                        SELECT {EFFECTIVE_PRICE_SQL} AS br
                        FROM products p
                        WHERE p.business_id = :bid AND p.status = 'ACTIVE'
                        {category_ids_sql}
                    ) eff
                """),
                params,
            )
        ).fetchall()
        prices = [int(r[0]) for r in rows if r[0]]
        if not prices:
            return []
        lo, hi = min(prices), max(prices)
        # thresholds strictly inside (lo, hi) split the range
        cuts = [t for t in self._BUCKET_THRESHOLDS if lo < t < hi]
        if not cuts and hi <= self._BUCKET_THRESHOLDS[0]:
            # everything fits under the smallest threshold — one capped bucket
            bounds = [None, self._BUCKET_THRESHOLDS[0]]
        else:
            bounds = [None] + cuts + [None]  # bucket edges; None = open-ended
        buckets = []
        for i in range(len(bounds) - 1):
            b_min = bounds[i]
            b_max = bounds[i + 1]
            count = sum(
                1 for p in prices
                if (b_min is None or p > b_min) and (b_max is None or p <= b_max)
            )
            if count == 0:
                continue
            if b_min is None and b_max is None:
                label = f"All ({self._rupee(prices[0])})"
            elif b_min is None and b_max is not None:
                label = f"Under {self._rupee(b_max)}"
            elif b_max is None and b_min is not None:
                label = f"{self._rupee(b_min)} & above"
            else:
                label = f"{self._rupee(b_min)} – {self._rupee(b_max)}"
            buckets.append({
                "label": label,
                "min_price": b_min,
                "max_price": b_max,
                "product_count": count,
            })
        return buckets

    async def category_page(self, slug: str) -> Optional[dict]:
        """Landing-page payload for a category slug: node, children, brand
        facet, auto price buckets, featured products, and admin overrides."""
        from modules.storefront.schemas import StoreCategory
        store_id = await self._store_business_id()

        # Resolve the category node (root or child — children get their own page)
        node_row = (
            await self.session.execute(
                text("""
                    SELECT c.id, c.name, c.slug, c.parent_id, c.image_url, c.icon, c.keywords
                    FROM categories c
                    WHERE c.business_id = :bid AND (c.slug = :s OR c.id::text = :s)
                    LIMIT 1
                """),
                {"bid": store_id, "s": slug},
            )
        ).mappings().first()
        if not node_row:
            return None
        cat = dict(node_row)

        # Children with live counts
        child_rows = (
            await self.session.execute(
                text("""
                    SELECT c.id, c.name, c.slug, c.parent_id, c.image_url, c.icon, c.keywords,
                           (SELECT count(*) FROM products p
                            WHERE p.category_id = c.id AND p.status = 'ACTIVE') AS product_count
                    FROM categories c
                    WHERE c.business_id = :bid AND c.parent_id = :cid
                    ORDER BY c.position, c.name
                """),
                {"bid": store_id, "cid": cat["id"]},
            )
        ).mappings().all()
        children = [
            StoreCategory(
                id=r["id"], name=r["name"], slug=r["slug"], parent_id=r["parent_id"],
                product_count=r["product_count"], image_url=r.get("image_url"),
                icon=r.get("icon"), keywords=r.get("keywords"),
            )
            for r in child_rows
        ]

        # Category tree scope: this node + its children (parents are navigation)
        cat_scope = "AND (p.category_id = :cid OR p.category_id IN (SELECT id FROM categories WHERE parent_id = :cid))"

        # Brand facet via the scoped brands() (pass the slug)
        brand_facet = await self.brands(cat["slug"])

        # Featured products in the tree
        featured_rows = (
            await self.session.execute(
                text(f"""
                    SELECT p.id, p.name, p.slug, p.brand, p.price, p.mrp, p.sale_price,
                           p.offer_name, p.offer_starts_at, p.offer_ends_at, p.category_id,
                           c.name AS category_name, c.slug AS category_slug,
                           {EFFECTIVE_PRICE_SQL} AS effective_price,
                           p.return_policy, p.warranty_info, p.sku, p.description, p.tags
                    FROM products p
                    LEFT JOIN categories c ON c.id = p.category_id
                    WHERE p.business_id = :bid AND p.status = 'ACTIVE' AND p.featured = true
                    {cat_scope}
                    ORDER BY p.created_at DESC
                    LIMIT 12
                """),
                {"bid": store_id, "cid": cat["id"]},
            )
        ).mappings().all()
        featured_ids = [r["id"] for r in featured_rows]
        images = await self._load_images(featured_ids)
        stocks = await self._load_stock(featured_ids)
        featured = [
            self._product_row_to_model(r, images.get(r["id"], []), stocks.get(r["id"]))
            for r in featured_rows
        ]

        price_buckets = await self._price_buckets(store_id, cat_scope, {"bid": store_id, "cid": cat["id"]})

        # Admin overrides live in business_settings.config.store.category_pages[slug]
        overrides: dict = {}
        try:
            from core.store import get_store_settings
            store_cfg = await get_store_settings(self.session)
            page_cfg = (store_cfg.get("category_pages") or {}).get(cat["slug"]) or {}
            overrides = page_cfg
        except Exception:
            overrides = {}

        # Custom buckets override auto buckets when provided
        if overrides.get("price_buckets"):
            price_buckets = overrides["price_buckets"]

        # Curated featured picks replace auto-featured when provided
        if overrides.get("featured_product_ids"):
            wanted = overrides["featured_product_ids"][:12]
            cur_rows = (
                await self.session.execute(
                    text(f"""
                        SELECT p.id, p.name, p.slug, p.brand, p.price, p.mrp, p.sale_price,
                               p.offer_name, p.offer_starts_at, p.offer_ends_at, p.category_id,
                               c.name AS category_name, c.slug AS category_slug,
                               {EFFECTIVE_PRICE_SQL} AS effective_price,
                               p.return_policy, p.warranty_info, p.sku, p.description, p.tags
                        FROM products p
                        LEFT JOIN categories c ON c.id = p.category_id
                        WHERE p.business_id = :bid AND p.status = 'ACTIVE'
                              AND p.id = ANY(:ids)
                        ORDER BY array_position(:ids, p.id)
                    """),
                    {"bid": store_id, "ids": wanted},
                )
            ).mappings().all()
            cur_ids = [r["id"] for r in cur_rows]
            c_images = await self._load_images(cur_ids)
            c_stocks = await self._load_stock(cur_ids)
            featured = [
                self._product_row_to_model(r, c_images.get(r["id"], []), c_stocks.get(r["id"]))
                for r in cur_rows
            ]

        return {
            "category": StoreCategory(
                id=cat["id"], name=cat["name"], slug=cat["slug"], parent_id=cat["parent_id"],
                product_count=0, image_url=cat.get("image_url"), icon=cat.get("icon"),
                keywords=cat.get("keywords"),
            ),
            "children": children,
            "brands": brand_facet,
            "price_buckets": price_buckets,
            "featured": featured,
            "overrides": overrides,
        }

    async def search_suggestions(self, q: str, limit: int = 8) -> List[SearchSuggestion]:
        if not q or len(q.strip()) < 2:
            return []
        store_id = await self._store_business_id()
        
        words = q.strip().split()
        # Cap words to prevent huge queries
        if len(words) > 5:
            words = words[:5]
            
        conditions = []
        params = {"bid": store_id, "lim": limit}
        for i, w in enumerate(words):
            like = f"%{w}%"
            params[f"q{i}"] = like
            conditions.append(f"(p.name ILIKE :q{i} OR p.brand ILIKE :q{i} OR p.sku ILIKE :q{i} OR c.name ILIKE :q{i} OR p.tags::text ILIKE :q{i})")
            
        where_clause = " AND ".join(conditions)

        rows = (
            await self.session.execute(
                text(f"""
                    {self._BASE_SELECT}
                    WHERE p.business_id = :bid AND p.status = 'ACTIVE'
                      AND {where_clause}
                    ORDER BY p.featured DESC, p.name ASC LIMIT :lim
                """),
                params,
            )
        ).mappings().all()
        images = await self._load_images([r["id"] for r in rows])
        return [
            SearchSuggestion(
                id=r["id"], name=r["name"], slug=r.get("slug"), brand=r.get("brand"),
                image=(images.get(r["id"]) or [None])[0],
                effective_price=r["effective_price"],
            )
            for r in rows
        ]

    async def get_products_by_ids(self, product_ids: list) -> list:
        """Fetch full product data for a list of product IDs, preserving order."""
        if not product_ids:
            return []
        store_id = await self._store_business_id()
        placeholders = ", ".join(f":pid_{i}" for i in range(len(product_ids)))
        params = {"bid": store_id}
        for i, pid in enumerate(product_ids):
            params[f"pid_{i}"] = pid
        rows = (
            await self.session.execute(
                text(f"""
                    {self._BASE_SELECT}
                    WHERE p.business_id = :bid AND p.status = 'ACTIVE'
                      AND p.id IN ({placeholders})
                """),
                params,
            )
        ).mappings().all()

        # Build a lookup then re-order to match product_ids order
        ids_set = {r["id"]: r for r in rows}
        ordered_rows = [ids_set[pid] for pid in product_ids if pid in ids_set]

        ids = [r["id"] for r in ordered_rows]
        images = await self._load_images(ids)
        stocks = await self._load_stock(ids)
        variants = await self._load_variants(ids)
        items = []
        for r in ordered_rows:
            m = self._product_row_to_model(r, images.get(r["id"], []), stocks.get(r["id"]))
            m.variants = [StoreVariant(**v) for v in variants.get(r["id"], [])]
            items.append(m)
        return [i.model_dump() for i in items]
