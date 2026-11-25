from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr


class SellerOtpRequest(BaseModel):
    email: EmailStr


class SellerOtpVerify(BaseModel):
    email: EmailStr
    code: str


class SellerResponse(BaseModel):
    id: str
    name: str
    business_name: str
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    address_line2: Optional[str] = None
    gstin: Optional[str] = None
    status: str
    rating: float
    rating_count: int
    created_at: Optional[datetime] = None


class SellerCreateAdmin(BaseModel):
    name: str
    business_name: str
    email: EmailStr
    phone: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    commission_rate: Optional[float] = 0.0
    password: Optional[str] = None
    must_change_password: Optional[bool] = True


class SellerApplicationCreate(BaseModel):
    name: str  # Contact Person
    business_name: str  # Business / Firm Name
    email: EmailStr
    phone: str
    city: str
    state: Optional[str] = None
    pincode: str
    address: Optional[str] = None
    gstin: Optional[str] = None
    category: Optional[str] = None
    comments: Optional[str] = None


class SellerApprovalRequest(BaseModel):
    commission_rate: Optional[float] = 0.0
    custom_password: Optional[str] = None


class SellerAdminUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    address_line2: Optional[str] = None
    gstin: Optional[str] = None
    commission_rate: Optional[float] = None
    status: Optional[str] = None


class SellerStatusUpdate(BaseModel):
    status: str  # ACTIVE, SUSPENDED, or ARCHIVED


class SellerProductItem(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    sku: Optional[str] = None
    brand: Optional[str] = None
    price: int  # paise
    mrp: Optional[int] = None  # paise
    sale_price: Optional[int] = None
    stock: int
    status: str
    is_active: bool = True
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    parent_category_name: Optional[str] = None
    description: Optional[str] = None
    warranty_info: Optional[str] = None
    return_policy: Optional[str] = None
    specs: Optional[List[Dict[str, Any]]] = None
    images: List[str] = []
    created_at: Optional[datetime] = None


class SellerProductCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category_id: Optional[str] = None
    price: float  # rupees input in frontend, converted to paise
    mrp: Optional[float] = None
    stock: int = 10
    sku: Optional[str] = None
    description: Optional[str] = None
    warranty_info: Optional[str] = None
    return_policy: Optional[str] = None
    specs: Optional[List[Dict[str, str]]] = None
    images: Optional[List[str]] = None


class SellerProductUpdate(BaseModel):
    price: Optional[float] = None
    mrp: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    warranty_info: Optional[str] = None
    return_policy: Optional[str] = None
    specs: Optional[List[Dict[str, str]]] = None
    images: Optional[List[str]] = None


class ProductChangeRequestItem(BaseModel):
    """A seller's proposed catalog edit, awaiting admin review."""

    id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    requested_by_seller_id: str
    seller_name: Optional[str] = None
    changes: Dict[str, Any]
    status: str
    review_note: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_by_email: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    # Current catalog values for the same keys, so admin can see a diff.
    current_values: Optional[Dict[str, Any]] = None


class ProductChangeReview(BaseModel):
    """Admin decision on a pending change request."""

    note: Optional[str] = None


class SellerPasswordLogin(BaseModel):
    email: EmailStr
    password: str


class SellerProfileUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None  # Line 1
    address_line2: Optional[str] = None  # Line 2 / Landmark
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None


class SellerPasswordChange(BaseModel):
    current_password: str
    new_password: str


class SellerAttachOffer(BaseModel):
    product_id: str
    price: float  # rupees
    mrp: Optional[float] = None  # rupees
    stock: int = 10
    sku: Optional[str] = None
    condition: Optional[str] = "NEW"
    estimated_delivery_days: Optional[int] = 3


class AIGenerateRequest(BaseModel):
    name: str
    brand: Optional[str] = None
    category_name: Optional[str] = None
    existing_desc: Optional[str] = None


class DuplicateCandidateItem(BaseModel):
    id: str
    product_a_id: str
    product_a_name: str
    product_a_brand: Optional[str] = None
    product_a_price: int
    product_a_seller_name: Optional[str] = None
    product_a_image: Optional[str] = None
    product_b_id: str
    product_b_name: str
    product_b_brand: Optional[str] = None
    product_b_price: int
    product_b_seller_name: Optional[str] = None
    product_b_image: Optional[str] = None
    suggested_master_id: Optional[str] = None
    similarity_score: int
    confidence_score: int
    ai_reason: Optional[str] = None
    suggested_clean_title: Optional[str] = None
    status: str
    detected_at: Optional[datetime] = None


class DuplicateMergeRequest(BaseModel):
    master_product_id: str
    clean_title: Optional[str] = None


class SellerOrderItem(BaseModel):
    order_id: str
    order_number: Optional[str] = None
    item_id: str
    product_id: str
    product_name: str
    variant_name: Optional[str] = None
    quantity: int
    unit_price: int
    total: int
    fulfillment_status: str  # PENDING, PACKED, OUT_FOR_DELIVERY, SHIPPED, DELIVERED
    order_status: Optional[str] = None
    fulfillment_type: Optional[str] = None
    invoice_number: Optional[str] = None
    manual_invoice_url: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    imei_numbers: Optional[List[str]] = None
    customer_city: Optional[str] = None
    customer_pincode: Optional[str] = None
    created_at: Optional[datetime] = None


class SellerFulfillmentUpdate(BaseModel):
    manual_invoice_url: Optional[str] = None
    item_serials: Optional[Dict[str, List[str]]] = None
    item_imeis: Optional[Dict[str, List[str]]] = None


class SellerOrderDetailLine(BaseModel):
    """One line of a seller's order detail. Only this seller's lines are returned."""

    item_id: str
    product_id: str
    product_name: str
    variant_name: Optional[str] = None
    quantity: int
    unit_price: int
    total: int
    seller_name: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    imei_numbers: Optional[List[str]] = None


class SellerOrderDetail(BaseModel):
    """Full order view for the seller who owns the items: customer address,
    payment, money breakdown and the printable invoice reference."""

    order_id: str
    order_number: Optional[str] = None
    status: str
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    fulfillment_type: Optional[str] = None
    is_open_box: bool = True
    delivery_verified_at: Optional[datetime] = None
    invoice_number: Optional[str] = None
    manual_invoice_url: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    currency: str = "INR"
    # Money, minor units (paise). Line totals are this seller's share only;
    # the order-level totals cover the whole order.
    order_subtotal: int = 0
    order_tax_total: int = 0
    order_shipping_total: int = 0
    order_discount_total: int = 0
    order_total: int = 0
    items_subtotal: int = 0
    shipping_address: Optional[Dict[str, Any]] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[SellerOrderDetailLine] = []


class CategorySuggestion(BaseModel):
    name: str
    parent_id: Optional[str] = None


class CategoryApprovalItem(BaseModel):
    id: str
    name: str
    slug: str
    parent_id: Optional[str] = None
    parent_name: Optional[str] = None
    requested_by_seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
