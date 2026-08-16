from typing import List

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from core.exceptions import DomainException
from modules.products.models import ProductStatus
from modules.storefront.catalog import CatalogService
from modules.users.models import User
from modules.wishlist.models import WishlistItem
from modules.wishlist.schemas import WishlistItemResponse, WishlistResponse


class WishlistService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.catalog = CatalogService(session)

    async def _lazy_import_legacy(self, user: User) -> None:
        """One-time import of the legacy users.wishlist JSON column into the
        wishlist_items table (idempotent)."""
        legacy = user.wishlist or []
        if not legacy:
            return
        for pid in legacy:
            if not isinstance(pid, str):
                continue
            exists = await self.session.execute(
                select(WishlistItem.id).where(
                    WishlistItem.user_id == str(user.id),
                    WishlistItem.product_id == pid,
                )
            )
            if exists.scalar() is None:
                valid = await self.session.execute(
                    text("SELECT 1 FROM products WHERE id = :pid"), {"pid": pid}
                )
                if valid.scalar():
                    self.session.add(
                        WishlistItem(user_id=str(user.id), product_id=pid)
                    )
        user.wishlist = []
        await self.session.commit()

    async def list_wishlist(self, user: User) -> WishlistResponse:
        await self._lazy_import_legacy(user)
        res = await self.session.execute(
            select(WishlistItem)
            .where(WishlistItem.user_id == str(user.id))
            .order_by(WishlistItem.created_at.desc())
        )
        rows = list(res.scalars().all())
        products = {
            p.id: p
            for p in await self.catalog.products_by_ids([r.product_id for r in rows])
        }
        items = [
            WishlistItemResponse(
                id=r.id,
                product_id=r.product_id,
                created_at=r.created_at,
                product=products.get(r.product_id),
            )
            for r in rows
        ]
        return WishlistResponse(items=items, total=len(items))

    async def add(self, user: User, product_id: str) -> WishlistItemResponse:
        res = await self.session.execute(
            text("SELECT name, status FROM products WHERE id = :pid AND business_id = NULLIF(current_setting('app.business_id', true), '')"),
            {"pid": product_id},
        )
        row = res.mappings().first()
        if not row:
            raise DomainException("Product not found", code="NOT_FOUND", status_code=404)
        if row["status"] != ProductStatus.ACTIVE:
            raise DomainException("Product is not available", code="PRODUCT_UNAVAILABLE", status_code=409)

        await self.session.execute(
            text("""
                INSERT INTO wishlist_items (id, user_id, product_id)
                VALUES (gen_random_uuid()::text, :uid, :pid)
                ON CONFLICT (user_id, product_id) DO NOTHING
            """),
            {"uid": str(user.id), "pid": product_id},
        )
        await self.session.commit()

        res = await self.session.execute(
            text("SELECT id, created_at FROM wishlist_items WHERE user_id = :uid AND product_id = :pid"),
            {"uid": str(user.id), "pid": product_id},
        )
        item = res.mappings().one()
        product = (await self.catalog.products_by_ids([product_id]) or [None])[0]
        return WishlistItemResponse(
            id=item["id"], product_id=product_id,
            created_at=item["created_at"], product=product,
        )

    async def remove(self, user: User, product_id: str) -> None:
        res = await self.session.execute(
            select(WishlistItem).where(
                WishlistItem.user_id == str(user.id),
                WishlistItem.product_id == product_id,
            )
        )
        item = res.scalar_one_or_none()
        if item:
            await self.session.delete(item)
            await self.session.commit()
