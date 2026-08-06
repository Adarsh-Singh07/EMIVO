import uuid
from typing import Optional
from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from core.models import Base, TimestampMixin, SoftDeleteMixin

class Business(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[Optional[dict]] = mapped_column(JSON, default={}, nullable=False)
    
    # Contact info
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
