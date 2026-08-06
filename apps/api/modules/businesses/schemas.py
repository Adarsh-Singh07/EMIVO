from pydantic import BaseModel, EmailStr, Field, constr
from typing import Optional
from datetime import datetime

class BusinessBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r'^[a-z0-9-]+$')
    contact_email: EmailStr
    contact_phone: Optional[str] = Field(None, max_length=50)

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=50)
    settings: Optional[dict] = None
    is_active: Optional[bool] = None

class BusinessResponse(BusinessBase):
    id: str
    is_active: bool
    settings: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
