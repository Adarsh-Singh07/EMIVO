import uuid

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models, schemas


def get_products(db: Session, business_id: str, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Product)
        .filter(models.Product.business_id == business_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_product(db: Session, business_id: str, product_id: str):
    product = (
        db.query(models.Product)
        .filter(
            models.Product.id == product_id, models.Product.business_id == business_id
        )
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def create_product(db: Session, business_id: str, product: schemas.ProductCreate):
    try:
        # Create product
        db_product = models.Product(
            id=str(uuid.uuid4()),
            business_id=business_id,
            name=product.name,
            description=product.description,
            slug=product.slug,
            category_id=product.category_id,
            is_active=product.is_active,
        )
        db.add(db_product)

        # Add variants
        for v in product.variants:
            db_variant = models.ProductVariant(
                id=str(uuid.uuid4()),
                product_id=db_product.id,
                business_id=business_id,
                sku=v.sku,
                name=v.name,
                price=v.price,
                compare_at_price=v.compare_at_price,
                attributes=v.attributes,
                is_active=v.is_active,
                stock_quantity=0,
                reserved_quantity=0,
            )
            db.add(db_variant)

        # Add media
        for m in product.media:
            db_media = models.ProductMedia(
                id=str(uuid.uuid4()),
                product_id=db_product.id,
                business_id=business_id,
                media_ref=m.media_ref,
                media_type=m.media_type,
                position=m.position,
            )
            db.add(db_media)

        db.commit()
        db.refresh(db_product)
        return db_product

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="Slug or SKU already exists for this business"
        )


def get_categories(db: Session, business_id: str, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Category)
        .filter(models.Category.business_id == business_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_category(db: Session, business_id: str, category: schemas.CategoryCreate):
    db_category = models.Category(
        id=str(uuid.uuid4()),
        business_id=business_id,
        name=category.name,
        slug=category.slug,
        parent_id=category.parent_id,
    )
    db.add(db_category)
    try:
        db.commit()
        db.refresh(db_category)
        return db_category
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Category already exists")


def update_inventory(
    db: Session, business_id: str, variant_id: str, adjust: schemas.InventoryAdjust
):
    variant = (
        db.query(models.ProductVariant)
        .filter(
            models.ProductVariant.id == variant_id,
            models.ProductVariant.business_id == business_id,
        )
        .first()
    )

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    # Check if stock goes negative
    if variant.stock_quantity + adjust.quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    variant.stock_quantity += adjust.quantity
    db.commit()
    db.refresh(variant)

    # Ideally emit ProductUpdated event for workers/search sync here
    return variant


def reserve_inventory(
    db: Session,
    business_id: str,
    variant_id: str,
    reserve: schemas.InventoryReservation,
):
    variant = (
        db.query(models.ProductVariant)
        .filter(
            models.ProductVariant.id == variant_id,
            models.ProductVariant.business_id == business_id,
        )
        .first()
    )

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    available_stock = variant.stock_quantity - variant.reserved_quantity
    if available_stock < reserve.quantity:
        raise HTTPException(
            status_code=400, detail="Insufficient available stock for reservation"
        )

    variant.reserved_quantity += reserve.quantity
    db.commit()
    db.refresh(variant)
    return variant


def confirm_reservation(db: Session, business_id: str, variant_id: str, quantity: int):
    variant = (
        db.query(models.ProductVariant)
        .filter(
            models.ProductVariant.id == variant_id,
            models.ProductVariant.business_id == business_id,
        )
        .first()
    )

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    if variant.reserved_quantity < quantity:
        raise HTTPException(
            status_code=400, detail="Confirmation quantity exceeds reserved quantity"
        )

    variant.stock_quantity -= quantity
    variant.reserved_quantity -= quantity
    db.commit()
    db.refresh(variant)
    return variant


def cancel_reservation(db: Session, business_id: str, variant_id: str, quantity: int):
    variant = (
        db.query(models.ProductVariant)
        .filter(
            models.ProductVariant.id == variant_id,
            models.ProductVariant.business_id == business_id,
        )
        .first()
    )

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    if variant.reserved_quantity < quantity:
        raise HTTPException(
            status_code=400, detail="Cancel quantity exceeds reserved quantity"
        )

    variant.reserved_quantity -= quantity
    db.commit()
    db.refresh(variant)
    return variant
