from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from core.store import get_store_business_id
from modules.marketing.models import NewsletterSubscriber

router = APIRouter(prefix="/api/v1/newsletter", tags=["newsletter"])


class SubscribeRequest(BaseModel):
    email: EmailStr
    source: str = Field(default="storefront", max_length=50)


class SubscribeResponse(BaseModel):
    subscribed: bool
    message: str


@router.post("/subscribe", response_model=SubscribeResponse, status_code=status.HTTP_201_CREATED)
async def subscribe(
    payload: SubscribeRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """Public newsletter signup. Idempotent: re-subscribing returns success."""
    # Scope the session to the store tenant for RLS
    store_id = await get_store_business_id(session)
    from sqlalchemy import text
    await session.execute(
        text("SELECT set_config('app.business_id', :bid, true)"), {"bid": store_id}
    )
    session.add(
        NewsletterSubscriber(email=payload.email.lower(), source=payload.source)
    )
    try:
        await session.commit()
        return SubscribeResponse(subscribed=True, message="Subscribed! Welcome to ELEKTRIX.")
    except IntegrityError:
        await session.rollback()
        return SubscribeResponse(subscribed=True, message="You're already on the list!")
