"""OTP login (passwordless) flows: email code via outbox, phone code via the
SMS provider abstraction, attempt limits, cooldown, single-use, and
anti-enumeration guarantees."""
import uuid

import pytest

from conftest import register_and_login

pytestmark = pytest.mark.asyncio


async def _latest_otp_code(email: str) -> str:
    from sqlalchemy import text
    from core.database import async_session_maker
    async with async_session_maker() as s:
        row = (await s.execute(text("""
            SELECT payload FROM outbox_events
            WHERE type = 'auth.otp_login' AND payload->>'email' = :e
            ORDER BY created_at DESC LIMIT 1
        """), {"e": email})).scalar()
    assert row and row.get("code"), "OTP email event missing"
    return row["code"]


async def test_otp_email_flow_full(client):
    user = await register_and_login(client, 881001)

    r = await client.post("/api/v1/auth/otp/request", json={"email": user["email"]})
    assert r.status_code == 202

    code = await _latest_otp_code(user["email"])

    r = await client.post("/api/v1/auth/otp/verify", json={
        "email": user["email"], "code": code,
    })
    assert r.status_code == 200, r.text
    tokens = r.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    # Tokens actually authenticate
    r = await client.get("/api/v1/users/me", headers={
        "Authorization": f"Bearer {tokens['access_token']}"
    })
    assert r.status_code == 200
    assert r.json()["email"] == user["email"]


async def test_otp_single_use(client):
    user = await register_and_login(client, 881002)
    await client.post("/api/v1/auth/otp/request", json={"email": user["email"]})
    code = await _latest_otp_code(user["email"])

    r = await client.post("/api/v1/auth/otp/verify", json={"email": user["email"], "code": code})
    assert r.status_code == 200

    # Same code again — must be rejected (single use)
    r = await client.post("/api/v1/auth/otp/verify", json={"email": user["email"], "code": code})
    assert r.status_code == 401


async def test_otp_wrong_code_and_attempt_limit(client):
    user = await register_and_login(client, 881003)
    await client.post("/api/v1/auth/otp/request", json={"email": user["email"]})
    code = await _latest_otp_code(user["email"])

    for _ in range(5):
        r = await client.post("/api/v1/auth/otp/verify", json={
            "email": user["email"], "code": "000001" if code != "000001" else "000002",
        })
        assert r.status_code == 401

    # After 5 wrong attempts even the CORRECT code is dead
    r = await client.post("/api/v1/auth/otp/verify", json={"email": user["email"], "code": code})
    assert r.status_code == 401


async def test_otp_unknown_email_no_enumeration(client):
    # Request for an address with no account behaves identically
    r = await client.post("/api/v1/auth/otp/request", json={"email": f"ghost{uuid.uuid4().hex[:8]}@example.com"})
    assert r.status_code == 202

    # ...and no code exists to verify with
    r = await client.post("/api/v1/auth/otp/verify", json={
        "email": f"ghost{uuid.uuid4().hex[:8]}@example.com", "code": "123456",
    })
    assert r.status_code == 401


async def test_otp_resend_cooldown(client):
    user = await register_and_login(client, 881004)
    r = await client.post("/api/v1/auth/otp/request", json={"email": user["email"]})
    assert r.status_code == 202

    r = await client.post("/api/v1/auth/otp/request", json={"email": user["email"]})
    assert r.status_code == 429


async def test_otp_phone_falls_back_to_email_when_sms_unconfigured(client):
    user = await register_and_login(client, 881005)
    phone = f"98765{uuid.uuid4().int % 100000:05d}"
    r = await client.put("/api/v1/users/me", headers=user["headers"], json={"phone": phone})
    assert r.status_code == 200, r.text

    # The console SMS provider refuses to operate (a code that only reaches
    # the logs is not authentication) — the request must still succeed by
    # falling back to the account's email, and the response must say so.
    r = await client.post("/api/v1/auth/otp/request", json={"phone": phone})
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["channel"] == "email"
    assert body["masked_email"] and "•••" in body["masked_email"]

    # The code was delivered to the ACCOUNT's email via the outbox
    code = await _latest_otp_code(user["email"])
    r = await client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200, r.text


async def test_otp_phone_happy_path_with_real_provider(client, monkeypatch):
    """With a usable SMS provider wired, the phone flow logs the user in."""

    class FakeSms:
        usable = True
        last_code = None

        async def send_otp(self, to_phone: str, code: str) -> bool:
            FakeSms.last_code = code
            return True

    import modules.notifications.providers as providers
    monkeypatch.setattr(providers, "get_sms_provider", lambda: FakeSms())

    user = await register_and_login(client, 881006)
    phone = f"98766{uuid.uuid4().int % 100000:05d}"
    r = await client.put("/api/v1/users/me", headers=user["headers"], json={"phone": phone})
    assert r.status_code == 200, r.text

    # Request with a formatted variant (+91, spaces) — must still match
    pretty = f"+91 {phone[:5]} {phone[5:]}"
    r = await client.post("/api/v1/auth/otp/request", json={"phone": pretty})
    assert r.status_code == 202, r.text
    assert FakeSms.last_code and len(FakeSms.last_code) == 6

    r = await client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": FakeSms.last_code})
    assert r.status_code == 200, r.text
    tokens = r.json()
    r = await client.get("/api/v1/users/me", headers={
        "Authorization": f"Bearer {tokens['access_token']}"
    })
    assert r.status_code == 200
    assert r.json()["email"] == user["email"]


async def test_otp_validation(client):
    # Both identifiers → 422; neither → 422; malformed code → 422
    r = await client.post("/api/v1/auth/otp/request", json={"email": "a@example.com", "phone": "9876500000"})
    assert r.status_code == 422
    r = await client.post("/api/v1/auth/otp/request", json={})
    assert r.status_code == 422
    r = await client.post("/api/v1/auth/otp/verify", json={"email": "a@example.com", "code": "12ab56"})
    assert r.status_code == 422
