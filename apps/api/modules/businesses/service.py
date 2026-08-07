from datetime import datetime, timezone

from core.exceptions import DomainException
from modules.businesses.models import Business
from modules.businesses.repository import BusinessRepository
from modules.businesses.schemas import BusinessCreate, BusinessUpdate


class BusinessService:
    def __init__(self, repo: BusinessRepository):
        self.repo = repo

    async def create_business(self, data: BusinessCreate) -> Business:
        # Check slug uniqueness
        existing = await self.repo.get_by_slug(data.slug)
        if existing:
            raise DomainException(
                message="A business with this slug already exists", code="SLUG_TAKEN"
            )

        business = Business(
            name=data.name,
            slug=data.slug,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
        )
        return await self.repo.create(business)

    async def get_business(self, business_id: str) -> Business:
        business = await self.repo.get_by_id(business_id)
        if not business:
            raise DomainException(
                message="Business not found", code="NOT_FOUND", status_code=404
            )
        return business

    async def update_business(self, business_id: str, data: BusinessUpdate) -> Business:
        business = await self.get_business(business_id)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(business, key, value)

        return await self.repo.update(business)

    async def delete_business(self, business_id: str) -> None:
        business = await self.get_business(business_id)
        business.deleted_at = datetime.now(timezone.utc)
        business.is_active = False
        await self.repo.update(business)
        # TODO: Publish BusinessDeleted domain event
