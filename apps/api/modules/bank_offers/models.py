import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.models import TenantMixin, TimestampMixin


class BankOffer(Base, TimestampMixin, TenantMixin):
    """Merchandising bank-card offer ("10% instant discount, HDFC credit cards").

    Informational only: the discount is settled by the bank during payment,
    so nothing here feeds order pricing. Eligibility is linked through
    bank_offers_products; an offer with no linked products is treated as
    sitewide by the storefront.
    """

    __tablename__ = "bank_offers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bank_name: Mapped[str] = mapped_column(String(80), nullable=False)
    # CREDIT | DEBIT | ALL
    card_type: Mapped[str] = mapped_column(String(20), nullable=False, default="ALL")
    discount_text: Mapped[str] = mapped_column(String(200), nullable=False)
    poster_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # NULL bound = unbounded, same convention as coupons start/end dates.
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class BankOfferProduct(Base, TimestampMixin, TenantMixin):
    """Eligibility join row: which products a bank offer applies to.

    Real FKs (not a JSONB id list) so deleted products clean up their links
    via CASCADE instead of leaving stale ids behind.
    """

    __tablename__ = "bank_offers_products"

    bank_offer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bank_offers.id", ondelete="CASCADE"), primary_key=True
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
