from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from modules.users.schemas import UserResponse as UsersMeResponse
import re
from typing import Optional

def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[\W_]", v):
        raise ValueError("Password must contain at least one special character")
    return v



class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    # Mobile number is compulsory at signup and unique across accounts.
    # Accepts 10-digit Indian mobiles (with/without +91 / 0); stored normalized.
    phone: str = Field(..., min_length=10, max_length=15, pattern=r"^[0-9+\-\s]+$")
    access_token: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    # The authenticated user rides along with the tokens so the client can
    # finish login in a single round-trip (no follow-up /users/me call).
    # Same shape as GET /users/me so clients can use either interchangeably.
    user: Optional["UsersMeResponse"] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class OtpRequestIn(BaseModel):
    """Request a one-time login or registration code."""
    email: EmailStr | None = None
    phone: str | None = Field(
        None, min_length=8, max_length=15, pattern=r"^\+?[0-9\s\-]{8,15}$"
    )
    purpose: Optional[str] = "login"
    first_name: Optional[str] = None

    @model_validator(mode="after")
    def validate_identifier(self):
        if self.purpose == "register":
            if not self.email:
                raise ValueError("Email is required for registration verification code")
        else:
            if bool(self.email) == bool(self.phone):
                raise ValueError("Provide exactly one of email or phone")
        return self


class RegistrationOtpVerifyIn(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class OtpVerifyIn(BaseModel):
    """Verify a one-time login code and receive tokens."""
    email: EmailStr | None = None
    phone: str | None = Field(
        None, min_length=8, max_length=15, pattern=r"^\+?[0-9\s\-]{8,15}$"
    )
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    access_token: Optional[str] = None

    @model_validator(mode="after")
    def exactly_one_identifier(self):
        if bool(self.email) == bool(self.phone):
            raise ValueError("Provide exactly one of email or phone")
        return self


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=20, max_length=128)
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)


class UserResponse(UserBase):
    id: str
    is_active: bool
    is_email_verified: bool
    mfa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterResponse(UserResponse):
    """register endpoint: tells the client whether the email-OTP
    verification step is pending before the account can be used."""
    verification_required: bool = False

