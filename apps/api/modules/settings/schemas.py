# API Schemas for Business Configuration (Settings)
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BusinessSettingsBase(BaseModel):
    config: dict[str, Any] = Field(default_factory=dict)

class BusinessSettingsUpdate(BusinessSettingsBase):
    pass

class BusinessSettingsResponse(BusinessSettingsBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class BusinessSettingsPublicResponse(BaseModel):
    """Public-facing settings for storefront (no sensitive config)."""
    currency: str = "INR"
    locale: str = "en-IN"
    theme: dict[str, Any] = Field(default_factory=dict)
    branding: dict[str, Any] = Field(default_factory=dict)
