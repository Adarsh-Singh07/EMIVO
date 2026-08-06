import uuid
from typing import Optional
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, TimestampMixin, SoftDeleteMixin

class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # Stored via argon2id
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Optional MFA
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

class RoleType:
    PLATFORM_ADMIN = 'platform_admin'
    OWNER = 'owner'
    STAFF = 'staff'
    CUSTOMER = 'customer'

class BusinessMember(Base, TimestampMixin):
    __tablename__ = "business_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String(36), ForeignKey('businesses.id'), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default=RoleType.CUSTOMER)
