from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base  # using generic db base


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True)
    business_id = Column(String, nullable=False)  # Phase 1 multi-tenant day 1
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    parent_id = Column(String, ForeignKey("categories.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # relationship for nested categories
    subcategories = relationship("Category", backref="parent", remote_side=[id])


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True)
    business_id = Column(String, nullable=False, index=True)  # Phase 1 multi-tenant

    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    slug = Column(String, nullable=False)

    category_id = Column(String, ForeignKey("categories.id"), nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    variants = relationship(
        "ProductVariant", back_populates="product", cascade="all, delete-orphan"
    )
    media = relationship(
        "ProductMedia", back_populates="product", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_products_business_slug", business_id, slug, unique=True),
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String, primary_key=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    business_id = Column(String, nullable=False)

    sku = Column(String, nullable=False)
    name = Column(String, nullable=False)  # e.g. "Size M, Color Red"

    # INTEGER money representation as required by guidelines
    # (Storing minor units: cents, paise, etc.)
    price = Column(Integer, nullable=False)
    compare_at_price = Column(Integer, nullable=True)

    # Inventory tracking endpoints functionality
    stock_quantity = Column(Integer, default=0, nullable=False)
    reserved_quantity = Column(Integer, default=0, nullable=False)  # for pending orders

    attributes = Column(JSON, default=dict)  # e.g. {"size": "M", "color": "Red"}

    is_active = Column(Boolean, default=True)

    product = relationship("Product", back_populates="variants")

    __table_args__ = (
        # partial-unique SKU index per business_id
        Index(
            "ix_product_variants_business_sku_unique",
            business_id,
            sku,
            unique=True,
            postgresql_where=(is_active == True),
        ),
    )


class ProductMedia(Base):
    __tablename__ = "product_media"

    id = Column(String, primary_key=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    business_id = Column(String, nullable=False)

    # media_ref keys (provider + key) as per 12-final-freeze-review.md
    media_ref = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # e.g. "image", "video"
    position = Column(Integer, default=0)

    product = relationship("Product", back_populates="media")
