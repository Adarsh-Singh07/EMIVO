import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import JSONB

from core.models import Base


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(String(36), primary_key=True, default=uuid.uuid4)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # JSONB payload for flexible configuration (currency, theme, locale, etc.)
    config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
