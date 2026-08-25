import enum
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class ProductStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    COMING_SOON = "COMING_SOON"


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    price = Column(Integer, nullable=False)  # Integer minor units (paise) — everyday selling price
    sku = Column(String(50), nullable=True)

    # v0.2 merchandising fields
    mrp = Column(Integer, nullable=True)  # list price (paise); price/mrp drives discount display
    sale_price = Column(Integer, nullable=True)  # festival offer price (paise), active only within offer window
    offer_starts_at = Column(DateTime(timezone=True), nullable=True)
    offer_ends_at = Column(DateTime(timezone=True), nullable=True)
    brand = Column(String(120), nullable=True)
    slug = Column(String(280), nullable=True)
    status = Column(
        Enum(ProductStatus, name="productstatus", native_enum=True),
        nullable=False,
        default=ProductStatus.ACTIVE,
        server_default="ACTIVE",
    )
    featured = Column(Boolean, nullable=False, default=False, server_default="false")
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    specs = Column(JSON, nullable=True)  # [{name, value}] specification rows
    tags = Column(JSON, nullable=True)   # [string]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('ix_products_business_id', 'business_id'),
        Index('ix_products_status', 'status'),
        Index('ix_products_slug', 'slug'),
        Index('ix_products_featured', 'featured'),
        Index('ix_products_business_status', 'business_id', 'status'),
        dict(comment="Catalog products; effective price logic lives in the service layer"),
    )

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", lazy="selectin")
    media = relationship("ProductMedia", back_populates="product", cascade="all, delete-orphan", lazy="selectin",
                         order_by="ProductMedia.position")
    category = relationship("Category", back_populates="products", lazy="joined", innerjoin=False)
    inventory = relationship("Inventory", back_populates="product", uselist=False, cascade="all, delete-orphan", lazy="selectin")


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(280), nullable=True)
    parent_id = Column(String, ForeignKey("categories.id"), nullable=True)
    position = Column(Integer, nullable=False, default=0, server_default="0")
    image_url = Column(String(1000), nullable=True)

    products = relationship("Product", back_populates="category")
    children = relationship("Category", cascade="all, delete-orphan", lazy="selectin")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    sku = Column(String(50), nullable=True)
    price = Column(Integer, nullable=False)

    product = relationship("Product", back_populates="variants")


class ProductMedia(Base):
    __tablename__ = "product_media"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    media_url = Column(String(1000), nullable=False)
    position = Column(Integer, nullable=False, default=0, server_default="0")
    
    alt_text = Column(String(255), nullable=True)

    product = relationship("Product", back_populates="media")
