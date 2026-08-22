from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool
    is_email_verified: bool
    mfa_enabled: bool
    addresses: list[dict] | None = None
    wishlist: list[str] | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    mfa_enabled: bool | None = None
    addresses: list[dict] | None = None
    wishlist: list[str] | None = None

