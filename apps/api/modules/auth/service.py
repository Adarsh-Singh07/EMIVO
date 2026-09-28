import secrets
import json
import hashlib
import re
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.hash import argon2
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import DomainException
from core.redis import redis_manager
from modules.auth.schemas import TokenResponse, UserCreate, UserLogin
from modules.users.models import User, BusinessMember, RoleType


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pwd_context = argon2
        self.redis = redis_manager.client

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def create_access_token(
        self, subject: str, roles: list[str], business_id: str = None
    ) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_expiration_minutes
        )
        to_encode = {
            "exp": expire,
            "sub": str(subject),
            "roles": roles,
            "jti": secrets.token_hex(16),
        }
        if business_id:
            to_encode["business_id"] = business_id

        encoded_jwt = jwt.encode(
            to_encode, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm
        )
        return encoded_jwt

    async def check_availability(self, email: str | None, phone: str | None) -> dict:
        """Read-only duplicate check for the register form's live feedback.
        Same matching semantics as register_user (email case-insensitive;
        phone by normalized value or shared last-10). No side effects."""
        email_n = (email or "").strip().lower()
        phone_n = self._normalize_phone(phone or "")

        email_taken = False
        if email_n:
            row = (
                await self.session.execute(select(User.id).where(User.email == email_n))
            ).scalar_one_or_none()
            email_taken = row is not None

        phone_taken = False
        if phone_n:
            row = (
                await self.session.execute(
                    select(User.id).where(
                        (User.phone == phone_n)
                        | (func.right(User.phone, 10) == phone_n[-10:])
                    )
                )
            ).scalar_one_or_none()
            phone_taken = row is not None

        return {"email_taken": email_taken, "phone_taken": phone_taken}

    async def register_user(self, data: UserCreate) -> dict:
        stmt = select(User).where(User.email == data.email)
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            raise DomainException("Email already registered", code="EMAIL_TAKEN")

        phone = self._normalize_phone(data.phone)
        if not await self.phone_available(phone):
            raise DomainException(
                "This mobile number is already registered on another account. "
                "If this is your number, please contact support at support@elektrix.in.",
                code="PHONE_IN_USE", status_code=409,
            )

        user = User(
            email=data.email,
            password_hash=self.get_password_hash(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            phone=phone,
            is_active=True,
            is_email_verified=False
        )
        self.session.add(user)
        await self.session.flush()

        from core.store import get_store_business_id
        import uuid
        business_id = await get_store_business_id(self.session)
        await self.session.execute(text("SELECT set_config('app.business_id', :bid, true)"), {"bid": str(business_id)})
        await self.session.execute(text("""
            INSERT INTO customers (id, business_id, name, email)
            VALUES (:id, :bid, :name, :email)
            ON CONFLICT (business_id, email) DO NOTHING
        """), {
            "id": str(uuid.uuid4()),
            "bid": business_id,
            "name": f"{data.first_name} {data.last_name}".strip(),
            "email": data.email
        })
        await self.session.commit()
        await self.session.refresh(user)

        # When email verification is enforced, email the account's activation
        # code right away so the frontend can complete the two-step flow.
        if settings.email_verification_required:
            await self.request_otp(email=user.email)

        return user

    async def authenticate_user(self, data: UserLogin) -> TokenResponse:
        stmt = select(User).where(User.email == data.email)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not self.verify_password(data.password, user.password_hash):
            # To prevent timing attacks, always hash a dummy password if user not found, though passlib often handles this.
            raise DomainException("Invalid credentials", code="UNAUTHORIZED", status_code=401)
            
        if user.deleted_at is not None:
            raise DomainException("Account no longer exists", code="UNAUTHORIZED", status_code=401)

        if not user.is_active:
            raise DomainException("Account is disabled", code="FORBIDDEN", status_code=401)

        if settings.email_verification_required and not user.is_email_verified:
            # Internal staff accounts (owner / platform_admin / staff) are
            # provisioned in-house and are never subject to the storefront
            # email-verification gate — a locked-out admin could otherwise
            # not recover. business_members is RLS-guarded, so set the same
            # app.user_id context _issue_tokens uses before reading it.
            await self.session.execute(
                text("SELECT set_config('app.user_id', :uid, true)"),
                {"uid": str(user.id)},
            )
            memberships = (
                await self.session.execute(
                    select(BusinessMember).where(BusinessMember.user_id == user.id)
                )
            ).scalars().all()
            is_staff = any(m.role != RoleType.CUSTOMER for m in memberships)
            if not is_staff:
                raise DomainException(
                    "Your email is not verified yet. Use OTP sign-in with the 6-digit "
                    "code we sent to your email to activate the account, then sign in "
                    "with your password.",
                    code="EMAIL_UNVERIFIED", status_code=403,
                )

        return await self._issue_tokens(user)
        
    async def _issue_tokens(self, user: User, family_id: str = None) -> TokenResponse:
        # Set RLS context so the business_members query is allowed
        await self.session.execute(
            text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user.id)}
        )
        
        # Load user roles from database (BusinessMember)
        stmt = select(BusinessMember).where(BusinessMember.user_id == user.id)
        result = await self.session.execute(stmt)
        memberships = result.scalars().all()
        
        # Collect roles
        roles = [m.role for m in memberships]
        if not roles:
            roles = [RoleType.CUSTOMER]

            
        access_token = self.create_access_token(subject=user.id, roles=roles)
        
        # Generate Refresh Token
        if not family_id:
            family_id = secrets.token_hex(16)
            
        token_value = secrets.token_hex(32)
        refresh_token = f"{family_id}:{token_value}"
        
        redis_key = f"auth:family:{family_id}"
        ttl_seconds = settings.refresh_token_expiration_days * 24 * 60 * 60
        
        # Keep the previously issued token for the short concurrent-refresh
        # grace window (see refresh_token) so parallel tabs don't log out.
        prior = await self.redis.hgetall(redis_key)
        prev_token = prior.get("token", "") if prior else ""
        await self.redis.hset(redis_key, mapping={
            "token": refresh_token,
            "prev_token": prev_token,
            "rotated_at": str(datetime.now(timezone.utc).timestamp()),
            "user_id": user.id,
        })
        await self.redis.expire(redis_key, ttl_seconds)
        
        # Track family for user (to allow revoking all sessions)
        user_families_key = f"auth:user:{user.id}:families"
        await self.redis.sadd(user_families_key, family_id)
        await self.redis.expire(user_families_key, ttl_seconds)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.jwt_expiration_minutes * 60,
            user=user,
        )

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        try:
            family_id, token_value = refresh_token.split(":")
        except ValueError:
            raise DomainException("Invalid refresh token format", code="UNAUTHORIZED", status_code=401)
            
        redis_key = f"auth:family:{family_id}"
        family_data = await self.redis.hgetall(redis_key)
        
        if not family_data:
            raise DomainException("Invalid or expired refresh token", code="UNAUTHORIZED", status_code=401)
            
        stored_token = family_data.get("token")
        user_id = family_data.get("user_id")
        
        if stored_token != refresh_token:
            # Token was already rotated. A REPLAY of an old token normally
            # means theft — invalidate the family. BUT two tabs of the same
            # browser (or the installed PWA alongside it) can refresh in
            # parallel; the loser presents the just-rotated token. That race
            # is benign: allow it within a short grace window so legitimate
            # sessions don't get logged out; only older replays kill the
            # family.
            prev_token = family_data.get("prev_token", "")
            rotated_at = float(family_data.get("rotated_at", "0") or 0)
            grace_ok = (
                bool(prev_token)
                and refresh_token == prev_token
                and (datetime.now(timezone.utc).timestamp() - rotated_at) <= 60
            )
            if not grace_ok:
                await self.redis.delete(redis_key)
                if user_id:
                    await self.redis.srem(f"auth:user:{user_id}:families", family_id)
                raise DomainException(
                    "Token reuse detected. Session invalidated.",
                    code="UNAUTHORIZED", status_code=401,
                )
            
        # Token is valid. Issue new pair.
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise DomainException("User is inactive or deleted", code="UNAUTHORIZED", status_code=401)
            
        return await self._issue_tokens(user, family_id=family_id)

    async def logout(self, refresh_token: str) -> None:
        try:
            family_id, _ = refresh_token.split(":")
            redis_key = f"auth:family:{family_id}"
            family_data = await self.redis.hgetall(redis_key)
            if family_data:
                user_id = family_data.get("user_id")
                await self.redis.delete(redis_key)
                if user_id:
                    await self.redis.srem(f"auth:user:{user_id}:families", family_id)
        except ValueError:
            pass # Invalid format, nothing to revoke

    # ------------------------------------------------------------------ #
    # Password reset (token in Redis, emailed via outbox)                   #
    # ------------------------------------------------------------------ #

    async def forgot_password(self, email: str) -> None:
        """Always succeeds silently (no user enumeration). When the account
        exists, a single-use 30-minute reset token is stored in Redis and a
        reset email is enqueued through the outbox."""
        from core.models import OutboxEvent

        await self.session.execute(
            text("SELECT set_config('app.user_id', '', true)")
        )
        stmt = select(User).where(User.email == email.lower())
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            return

        token = secrets.token_urlsafe(32)
        hashed_token = hashlib.sha256(token.encode()).hexdigest()
        await self.redis.set(f"auth:reset:{hashed_token}", str(user.id), ex=30 * 60)

        self.session.add(OutboxEvent(
            tenant_id=None,
            type="auth.password_reset",
            payload={
                "user_id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "token": token,
            },
        ))
        await self.session.commit()

    async def reset_password(self, token: str, new_password: str) -> None:
        hashed_token = hashlib.sha256(token.encode()).hexdigest()
        user_id = await self.redis.get(f"auth:reset:{hashed_token}")
        if not user_id:
            raise DomainException(
                "Invalid or expired reset token", code="BAD_REQUEST", status_code=400
            )

        await self.session.execute(
            text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user_id)}
        )
        result = await self.session.execute(select(User).where(User.id == str(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise DomainException("Account not found", code="NOT_FOUND", status_code=404)

        user.password_hash = self.get_password_hash(new_password)
        await self.session.commit()

        # Single use + revoke every active session
        await self.redis.delete(f"auth:reset:{hashed_token}")
        await self._revoke_all_sessions(str(user_id))

    async def _revoke_all_sessions(self, user_id: str) -> None:
        families = await self.redis.smembers(f"auth:user:{user_id}:families")
        for family_id in families or []:
            await self.redis.delete(f"auth:family:{family_id}")
        await self.redis.delete(f"auth:user:{user_id}:families")

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not self.verify_password(current_password, user.password_hash):
            raise DomainException(
                "Current password is incorrect", code="BAD_REQUEST", status_code=400
            )
        await self.session.execute(
            text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user.id)}
        )
        user.password_hash = self.get_password_hash(new_password)
        await self.session.commit()
        await self._revoke_all_sessions(str(user.id))

    # ------------------------------------------------------------------ #
    # OTP login (passwordless)                                              #
    # ------------------------------------------------------------------ #

    OTP_LENGTH = 6
    OTP_TTL_SECONDS = 10 * 60
    OTP_MAX_ATTEMPTS = 5
    OTP_RESEND_COOLDOWN_SECONDS = 60

    @staticmethod
    def _normalize_phone(raw: str) -> str:
        """Normalize to E.164-ish. Indian mobiles become +91XXXXXXXXXX."""
        digits = re.sub(r"\D", "", raw or "")
        if len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) == 10 and digits[0] in "6789":
            return f"+91{digits}"
        return f"+{digits}" if digits else ""

    @staticmethod
    def _mask_email(email: str) -> str:
        """a•••h@g•••.com — enough for the user to recognise their inbox
        without exposing the address in API responses."""
        local, _, domain = email.partition("@")
        if len(local) <= 2:
            masked_local = local[:1] + "•••"
        else:
            masked_local = f"{local[0]}•••{local[-1]}"
        d, _, tld = domain.partition(".")
        masked_domain = (d[0] + "•••" + d[-1] if len(d) > 2 else d) + (f".{tld}" if tld else "")
        return f"{masked_local}@{masked_domain}"

    async def phone_available(self, phone: str) -> bool:
        """True when the mobile number is not registered on ANY account
        (including soft-deleted ones — reuse requires contacting support)."""
        normalized = self._normalize_phone(phone)
        if not normalized or len(normalized) < 12:  # +91XXXXXXXXXX
            return False
        result = await self.session.execute(
            select(User.id).where(User.phone == normalized).limit(1)
        )
        return result.scalar_one_or_none() is None

    @staticmethod
    def _identifier_hash(identifier: str) -> str:
        # Codes are looked up by a hash of the identifier so a Redis dump
        # never reveals which accounts use OTP login.
        return hashlib.sha256(identifier.strip().lower().encode()).hexdigest()

    async def _find_user_by_identifier(
        self, email: str | None = None, phone: str | None = None
    ) -> User | None:
        await self.session.execute(
            text("SELECT set_config('app.user_id', '', true)")
        )
        if email:
            stmt = select(User).where(User.email == email.strip().lower())
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        normalized = self._normalize_phone(phone or "")
        if not normalized:
            return None
        # Match the normalized number exactly, or any stored variant sharing
        # the last 10 digits (users may have saved '91xxxxxxxxxx' or with
        # spaces) — the last-10 match only applies to Indian-length numbers.
        stmt = select(User).where(
            (User.phone == normalized)
            | (func.right(User.phone, 10) == normalized[-10:])
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def request_otp(self, email: str | None = None, phone: str | None = None) -> None:
        """Issue a single-use login code. The endpoint always reports success
        (202) — this method never reveals whether the account exists.
        Email codes go out via the outbox (with best-effort immediate
        delivery); phone codes go through the configured SMS provider."""
        from core.models import OutboxEvent

        identifier = (
            (email or "").strip().lower()
            if email
            else self._normalize_phone(phone or "")
        )
        if not identifier:
            raise DomainException(
                "Provide a valid email or phone number",
                code="BAD_REQUEST", status_code=400,
            )

        user = await self._find_user_by_identifier(email=email, phone=phone)
        if not user or user.deleted_at is not None or not user.is_active:
            return {"channel": "email"}  # silent success — no account enumeration

        # Phone delivery: prefer the configured SMS provider; when SMS is not
        # usable (e.g. not configured), fall back to the account's email so
        # phone-OTP users are never locked out of login.
        sms_provider = None
        deliver_via = "email"
        if phone:
            from modules.notifications.providers import get_sms_provider
            sms_provider = get_sms_provider()
            if sms_provider.usable:
                deliver_via = "sms"
            elif not user.email:
                raise DomainException(
                    "SMS login is not available right now. Please sign in with your password.",
                    code="SERVICE_UNAVAILABLE", status_code=503,
                )

        ident_hash = self._identifier_hash(identifier)
        cooldown_key = f"auth:otp:cd:{ident_hash}"
        if not await self.redis.set(
            cooldown_key, "1", nx=True, ex=self.OTP_RESEND_COOLDOWN_SECONDS
        ):
            raise DomainException(
                "Please wait a minute before requesting another code",
                code="RATE_LIMITED", status_code=429,
            )

        code = f"{secrets.randbelow(10 ** self.OTP_LENGTH):0{self.OTP_LENGTH}d}"
        otp_key = f"auth:otp:{ident_hash}"
        await self.redis.hset(
            otp_key,
            mapping={
                "c": hashlib.sha256(code.encode()).hexdigest(),  # never store the raw code
                "n": "0",
            },
        )
        await self.redis.expire(otp_key, self.OTP_TTL_SECONDS)

        if deliver_via == "sms":
            await sms_provider.send_otp(user.phone, code)
        else:
            # Email delivery — for email-OTP requests and for phone requests
            # when SMS is unavailable. Goes through the outbox with
            # best-effort immediate dispatch (the worker retries anyway).
            from core.models import OutboxEvent

            self.session.add(OutboxEvent(
                tenant_id=None,
                type="auth.otp_login",
                payload={
                    "user_id": str(user.id),
                    "email": user.email,
                    "code": code,
                    "first_name": user.first_name,
                    # Let the template explain why the code arrived when the
                    # user asked for a phone code.
                    "requested_phone": bool(phone) and deliver_via == "email",
                    "phone_last4": (user.phone or "")[-4:] if phone else "",
                },
            ))
            await self.session.commit()
            from modules.notifications.service import NotificationService
            row = await self.session.execute(text(
                "SELECT id FROM outbox_events "
                "WHERE type = 'auth.otp_login' AND status = 'pending' "
                "ORDER BY created_at DESC LIMIT 1"
            ))
            event_id = row.scalar()
            if event_id:
                try:
                    await NotificationService(self.session).process_outbox_event(str(event_id))
                except Exception:
                    await self.session.rollback()
        return {
            "channel": deliver_via,
            # Where the code actually went — masked so the user recognises
            # the inbox without the address being exposed.
            "masked_email": self._mask_email(user.email) if deliver_via == "email" else None,
        }

    async def verify_otp(
        self, email: str | None = None, phone: str | None = None, code: str = ""
    ) -> TokenResponse:
        """Exchange a valid one-time code for tokens. Codes are single-use,
        expire in 10 minutes, and invalidate after 5 wrong attempts."""
        identifier = (
            (email or "").strip().lower()
            if email
            else self._normalize_phone(phone or "")
        )
        if not identifier or not (code.isdigit() and len(code) == self.OTP_LENGTH):
            raise DomainException(
                "Invalid code", code="UNAUTHORIZED", status_code=401
            )

        ident_hash = self._identifier_hash(identifier)
        otp_key = f"auth:otp:{ident_hash}"
        data = await self.redis.hgetall(otp_key)
        if not data:
            raise DomainException(
                "Code expired or was never requested. Request a new one.",
                code="UNAUTHORIZED", status_code=401,
            )

        attempts = int(data.get("n", "0"))
        if attempts >= self.OTP_MAX_ATTEMPTS:
            await self.redis.delete(otp_key)
            raise DomainException(
                "Too many wrong attempts. Request a new code.",
                code="UNAUTHORIZED", status_code=401,
            )

        if not secrets.compare_digest(
            str(data.get("c", "")), hashlib.sha256(code.encode()).hexdigest()
        ):
            await self.redis.hincrby(otp_key, "n", 1)
            raise DomainException(
                "Incorrect code. Please try again.",
                code="UNAUTHORIZED", status_code=401,
            )

        await self.redis.delete(otp_key)  # single use

        user = await self._find_user_by_identifier(email=email, phone=phone)
        if not user or user.deleted_at is not None or not user.is_active:
            raise DomainException(
                "Invalid credentials", code="UNAUTHORIZED", status_code=401
            )

        # An email code doubles as the registration-verification step: once
        # redeemed, the account is activated for password sign-in too. The
        # users RLS UPDATE policy only matches rows whose id equals the
        # transaction's app.user_id, so set that context first — exactly the
        # pattern reset_password / change_password use for users updates.
        if email and not user.is_email_verified:
            await self.session.execute(
                text("SELECT set_config('app.user_id', :uid, true)"),
                {"uid": str(user.id)},
            )
            user.is_email_verified = True
            await self.session.commit()
            # Commit expires the ORM object's attributes; refresh so
            # _issue_tokens can read them again without a lazy-load.
            await self.session.refresh(user)

        return await self._issue_tokens(user)
