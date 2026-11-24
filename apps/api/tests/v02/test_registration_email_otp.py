import hashlib
import pytest
from unittest.mock import AsyncMock, patch

from core.exceptions import DomainException
from modules.auth.service import AuthService
from modules.notifications.templates import TEMPLATES, otp_register


@pytest.mark.asyncio
async def test_otp_register_template_rendering():
    """Verify registration OTP template produces correct subject, code, and copy."""
    payload = {
        "code": "849201",
        "first_name": "Adarsh",
        "email": "test@example.com",
    }
    subject, html = otp_register(payload, "https://elektrix.in")
    assert "Your ELEKTRIX verification code" in subject
    assert "849201" in html
    assert "Hi Adarsh" in html
    assert "EXPIRES IN 10 MINUTES" in html
    assert "auth.otp_register" in TEMPLATES


@pytest.mark.asyncio
async def test_registration_otp_service_flow(monkeypatch):
    """Test the registration OTP request and verification logic with mocked Redis and DB session."""
    fake_redis_store = {}

    class FakeRedis:
        async def set(self, key, value, nx=False, ex=None):
            if nx and key in fake_redis_store:
                return False
            fake_redis_store[key] = value
            return True

        async def get(self, key):
            return fake_redis_store.get(key)

        async def hset(self, key, mapping=None):
            if key not in fake_redis_store:
                fake_redis_store[key] = {}
            if mapping:
                fake_redis_store[key].update(mapping)
            return len(mapping) if mapping else 0

        async def hgetall(self, key):
            val = fake_redis_store.get(key, {})
            return val if isinstance(val, dict) else {}

        async def hincrby(self, key, field, amount=1):
            if key not in fake_redis_store:
                fake_redis_store[key] = {}
            curr = int(fake_redis_store[key].get(field, 0)) + amount
            fake_redis_store[key][field] = str(curr)
            return curr

        async def expire(self, key, seconds):
            return True

        async def delete(self, key):
            return fake_redis_store.pop(key, None) is not None

    from unittest.mock import AsyncMock, MagicMock
    mock_session = AsyncMock()
    # Mock no existing user for the new email
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalar.return_value = None
    mock_session.execute.return_value = mock_result

    from core.redis import redis_manager
    monkeypatch.setattr(redis_manager, "_redis", FakeRedis())
    svc = AuthService(mock_session)

    # 1. Request registration OTP for new email
    res = await svc.request_otp(
        email="shopper@example.com",
        purpose="register",
        first_name="Shopper",
    )
    assert res["channel"] == "email"
    assert res["status"] == "sent"

    # Verify outbox event was added
    assert mock_session.add.called
    outbox_event = mock_session.add.call_args[0][0]
    assert outbox_event.type == "auth.otp_register"
    code = outbox_event.payload["code"]
    assert len(code) == 6
    assert code.isdigit()

    # 2. Cooldown check: immediate second request must fail with RATE_LIMITED
    with pytest.raises(DomainException) as exc_info:
        await svc.request_otp(
            email="shopper@example.com",
            purpose="register",
            first_name="Shopper",
        )
    assert exc_info.value.status_code == 429
    assert exc_info.value.code == "RATE_LIMITED"

    # 3. Wrong code verification must fail with 401
    with pytest.raises(DomainException) as exc_wrong:
        await svc.verify_registration_otp(
            email="shopper@example.com",
            code="000000" if code != "000000" else "111111",
        )
    assert exc_wrong.value.status_code == 401

    # 4. Correct code verification must succeed and return temporary token
    verify_res = await svc.verify_registration_otp(
        email="shopper@example.com",
        code=code,
    )
    assert verify_res["status"] == "verified"
    assert verify_res["verified"] is True
    assert verify_res["token"]
    temp_token = verify_res["token"]

    # 5. Token is stored in Redis for registration verification
    ver_key = "auth:reg_verified:shopper@example.com"
    assert await svc.redis.get(ver_key) == temp_token

    # 6. Request for an already-taken email must raise EMAIL_TAKEN (400)
    mock_result.scalar_one_or_none.return_value = "existing-user-uuid"
    with pytest.raises(DomainException) as exc_taken:
        await svc.request_otp(
            email="existing@example.com",
            purpose="register",
            first_name="Shopper",
        )
    assert exc_taken.value.status_code == 400
    assert exc_taken.value.code == "EMAIL_TAKEN"
