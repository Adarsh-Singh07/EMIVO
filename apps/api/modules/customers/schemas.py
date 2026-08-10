from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, EmailStr, field_validator


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class CustomerUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class CustomerResponse(BaseModel):
    id: str
    business_id: str
    name: str
    email: str
    phone: str | None = None
    address: str | None = None
    notes: str | None = None
    created_at: Any
    updated_at: Any
    deleted_at: Any = None

    model_config = {"from_attributes": True}


class CustomerListResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool
