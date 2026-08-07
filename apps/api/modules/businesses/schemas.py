from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class BusinessBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    contact_email: EmailStr
    contact_phone: str | None = Field(None, max_length=50)


class BusinessCreate(BusinessBase):
    pass


class BusinessUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(None, max_length=50)
    settings: dict | None = None
    is_active: bool | None = None


class BusinessResponse(BusinessBase):
    id: str
    is_active: bool
    settings: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
