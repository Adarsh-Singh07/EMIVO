from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class AddressCreate(BaseModel):
    label: Optional[str] = Field(None, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., pattern=r"^[0-9]{10}$", description="10-digit Indian mobile")
    line1: str = Field(..., min_length=5, max_length=255)
    line2: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., min_length=2, max_length=120)
    state: str = Field(..., min_length=2, max_length=120)
    pincode: str = Field(..., pattern=r"^[1-9][0-9]{5}$", description="6-digit Indian PIN")
    country: str = Field("IN", min_length=2, max_length=2)
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=50)
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    phone: Optional[str] = Field(None, pattern=r"^[0-9]{10}$")
    line1: Optional[str] = Field(None, min_length=5, max_length=255)
    line2: Optional[str] = None
    city: Optional[str] = Field(None, min_length=2, max_length=120)
    state: Optional[str] = Field(None, min_length=2, max_length=120)
    pincode: Optional[str] = Field(None, pattern=r"^[1-9][0-9]{5}$")
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    id: str
    user_id: str
    label: Optional[str] = None
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AddressListResponse(BaseModel):
    items: List[AddressResponse]
