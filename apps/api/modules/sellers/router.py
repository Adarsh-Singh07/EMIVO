from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from core.ai_gateway import AIGateway
from core.config import settings
from core.database import get_db_session
from core.exceptions import DomainException
from modules.sellers.models import Seller
from modules.sellers.schemas import (
    AIGenerateRequest,
    CategoryApprovalItem,
    CategorySuggestion,
    DuplicateCandidateItem,
    DuplicateMergeRequest,
    SellerAdminUpdate,
    SellerAttachOffer,
    SellerCreateAdmin,
    SellerOrderItem,
    SellerOtpRequest,
    SellerOtpVerify,
    SellerPasswordChange,
    SellerPasswordLogin,
    SellerProductCreate,
    SellerProductItem,
    SellerProductUpdate,
    SellerProfileUpdate,
    SellerResponse,
    SellerStatusUpdate,
)
from modules.sellers.service import SellerService

router = APIRouter(tags=["Sellers & Marketplace"])
security = HTTPBearer(auto_error=False)


def _get_service(session: AsyncSession = Depends(get_db_session)) -> SellerService:
    return SellerService(session)


async def get_current_seller(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    service: SellerService = Depends(_get_service),
) -> Seller:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
        seller_id = payload.get("seller_id") or payload.get("sub")
        roles = payload.get("roles") or []
        if not seller_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        # Allow seller role or platform_admin
        if "seller" not in roles and "platform_admin" not in roles and "staff" not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller access required")

        from sqlalchemy import select
        res = await service.session.execute(select(Seller).where(Seller.id == seller_id))
        seller = res.scalar_one_or_none()
        if not seller:
            # Fallback if admin is acting as seller
            seller = (await service.session.execute(select(Seller).limit(1))).scalar_one_or_none()
            if not seller:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seller profile not found")
        return seller
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


# -----------------------------------------------------------------------------
# Seller Authentication (Password & Email OTP)
# -----------------------------------------------------------------------------

@router.post("/api/v1/seller/auth/login")
async def login_seller_password(data: SellerPasswordLogin, service: SellerService = Depends(_get_service)):
    return await service.login_with_password(data.email, data.password)


@router.post("/api/v1/seller/auth/otp/request")
async def request_seller_otp(data: SellerOtpRequest, service: SellerService = Depends(_get_service)):
    return await service.request_otp(data.email)


@router.post("/api/v1/seller/auth/otp/verify")
async def verify_seller_otp(data: SellerOtpVerify, service: SellerService = Depends(_get_service)):
    return await service.verify_otp(data.email, data.code)


@router.get("/api/v1/seller/me")
async def get_seller_profile(seller: Seller = Depends(get_current_seller)):
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


@router.put("/api/v1/seller/me")
async def update_seller_profile(
    data: SellerProfileUpdate,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.update_profile(seller.id, data)


@router.post("/api/v1/seller/me/change-password")
async def change_seller_password(
    data: SellerPasswordChange,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.change_password(seller.id, data.current_password, data.new_password)


# -----------------------------------------------------------------------------
# Seller Products & Inventory Management
# -----------------------------------------------------------------------------

@router.get("/api/v1/seller/products", response_model=List[SellerProductItem])
async def list_seller_products(
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.list_seller_products(seller.id)


@router.get("/api/v1/seller/products/{product_id}")
async def get_seller_product(
    product_id: str,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.get_seller_product(seller.id, product_id)


@router.post("/api/v1/seller/products", status_code=status.HTTP_201_CREATED)
async def create_seller_product(
    data: SellerProductCreate,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.create_seller_product(seller.id, data)


@router.put("/api/v1/seller/products/{product_id}")
async def update_seller_product(
    product_id: str,
    data: SellerProductUpdate,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.update_seller_product(seller.id, product_id, data)


@router.delete("/api/v1/seller/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seller_product(
    product_id: str,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    await service.delete_seller_product(seller.id, product_id)


# -----------------------------------------------------------------------------
# Catalog Matching & Agentic AI Product Generation
# -----------------------------------------------------------------------------

@router.get("/api/v1/seller/catalog/search")
async def search_catalog(
    q: Optional[str] = "",
    brand: Optional[str] = None,
    service: SellerService = Depends(_get_service),
):
    return await service.search_catalog(query=q or "", brand=brand)


@router.post("/api/v1/seller/catalog/attach-offer")
async def attach_seller_offer(
    data: SellerAttachOffer,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.attach_seller_offer(seller.id, data)


@router.post("/api/v1/seller/catalog/ai-generate")
async def ai_generate_product_details(
    data: AIGenerateRequest,
    seller: Seller = Depends(get_current_seller),
):
    return await AIGateway.generate_product_details(
        name=data.name,
        brand=data.brand,
        existing_desc=data.existing_desc,
        category_name=data.category_name,
    )


# -----------------------------------------------------------------------------
# Seller Orders & Fulfillment (Mark as Packed)
# -----------------------------------------------------------------------------

@router.get("/api/v1/seller/orders", response_model=List[SellerOrderItem])
async def get_seller_orders(
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.get_seller_orders(seller.id)


@router.post("/api/v1/seller/orders/{order_id}/items/{item_id}/pack")
async def mark_item_packed(
    order_id: str,
    item_id: str,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.mark_order_item_packed(seller.id, order_id, item_id)


# -----------------------------------------------------------------------------
# Category Suggestions by Sellers
# -----------------------------------------------------------------------------

@router.get("/api/v1/seller/categories")
async def get_seller_categories(service: SellerService = Depends(_get_service)):
    # Return all approved categories in hierarchical tree structure
    return await service.get_categories_tree()


@router.post("/api/v1/seller/categories/suggest")
async def suggest_category(
    data: CategorySuggestion,
    seller: Seller = Depends(get_current_seller),
    service: SellerService = Depends(_get_service),
):
    return await service.suggest_category(seller.id, data)


# -----------------------------------------------------------------------------
# Admin Management: Sellers & Category Approvals
# -----------------------------------------------------------------------------

@router.get("/api/v1/admin/sellers")
async def admin_list_sellers(service: SellerService = Depends(_get_service)):
    return await service.list_sellers_for_admin()


@router.post("/api/v1/admin/sellers", status_code=status.HTTP_201_CREATED)
async def admin_create_seller(data: SellerCreateAdmin, service: SellerService = Depends(_get_service)):
    return await service.create_seller_by_admin(data)


@router.put("/api/v1/admin/sellers/{seller_id}")
async def admin_update_seller(
    seller_id: str,
    data: SellerAdminUpdate,
    service: SellerService = Depends(_get_service),
):
    return await service.admin_update_seller(seller_id, data)


@router.delete("/api/v1/admin/sellers/{seller_id}")
async def admin_delete_seller(
    seller_id: str,
    service: SellerService = Depends(_get_service),
):
    return await service.admin_delete_seller(seller_id)


@router.put("/api/v1/admin/sellers/{seller_id}/status")
async def admin_update_seller_status(
    seller_id: str,
    data: SellerStatusUpdate,
    service: SellerService = Depends(_get_service),
):
    return await service.update_seller_status(seller_id, data.status)


@router.get("/api/v1/admin/categories/pending", response_model=List[CategoryApprovalItem])
async def admin_list_pending_categories(service: SellerService = Depends(_get_service)):
    return await service.list_pending_categories()


@router.post("/api/v1/admin/categories/{category_id}/approve")
async def admin_approve_category(category_id: str, service: SellerService = Depends(_get_service)):
    return await service.approve_category(category_id)


@router.post("/api/v1/admin/categories/{category_id}/reject")
async def admin_reject_category(category_id: str, service: SellerService = Depends(_get_service)):
    return await service.reject_category(category_id)


# -----------------------------------------------------------------------------
# Admin Catalog Deduplication Governance
# -----------------------------------------------------------------------------

@router.get("/api/v1/admin/catalog/duplicates", response_model=List[DuplicateCandidateItem])
async def admin_list_duplicates(service: SellerService = Depends(_get_service)):
    return await service.list_duplicate_candidates()


@router.post("/api/v1/admin/catalog/duplicates/{id}/merge")
async def admin_merge_duplicate(
    id: str,
    data: DuplicateMergeRequest,
    service: SellerService = Depends(_get_service),
):
    return await service.merge_duplicate_products(id, data.master_product_id, data.clean_title)


@router.post("/api/v1/admin/catalog/duplicates/{id}/dismiss")
async def admin_dismiss_duplicate(id: str, service: SellerService = Depends(_get_service)):
    return await service.dismiss_duplicate(id)


@router.post("/api/v1/admin/catalog/duplicates/trigger-scan")
async def admin_trigger_duplicate_scan(service: SellerService = Depends(_get_service)):
    return await service.run_ai_catalog_deduplication()
