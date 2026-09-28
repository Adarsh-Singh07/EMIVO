"""Registration email-OTP gate: when email_verification_required is on,
a fresh account cannot sign in with its password until it redeems the
activation code we emailed it."""
import os

import pytest

from conftest import _run

pytestmark = pytest.mark.asyncio


@pytest.fixture
def verification_on():
    from core.config import settings

    old = settings.email_verification_required
    settings.email_verification_required = True
    try:
        yield
    finally:
        settings.email_verification_required = old


async def test_register_email_otp_flow(client, verification_on):
    n = 820001
    email = f"verify{_run(n)}@example.com"
    password = "Passw0rd!123"
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": "Test",
            "last_name": f"Verify{n}",
            "phone": f"9{str(abs(n))[-9:].zfill(9)}",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["verification_required"] is True

    # Password sign-in is blocked until the emailed code is redeemed
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 403
    assert r.json()["code"] == "EMAIL_UNVERIFIED"

    # Read the activation code from the outbox payload
    from sqlalchemy import text
    from core.database import async_session_maker

    async with async_session_maker() as s:
        code = (
            await s.execute(
                text(
                    "SELECT payload->>'code' FROM outbox_events "
                    "WHERE type = 'auth.otp_login' AND payload->>'email' = :e "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"e": email},
            )
        ).scalar_one()

    # A wrong code is rejected
    wrong = "000000" if code != "000000" else "111111"
    r = await client.post("/api/v1/auth/otp/verify", json={"email": email, "code": wrong})
    assert r.status_code == 401

    # The right code activates the account and issues tokens
    r = await client.post("/api/v1/auth/otp/verify", json={"email": email, "code": code})
    assert r.status_code == 200, r.text
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = (await client.get("/api/v1/users/me", headers=headers)).json()
    assert me["is_email_verified"] is True

    # And password sign-in now works
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200


async def test_staff_accounts_bypass_email_gate(client, verification_on):
    """Owner/staff accounts are provisioned internally — the storefront
    email-verification gate must never lock an admin out."""
    from sqlalchemy import text
    from core.database import async_session_maker

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_INITIAL_PASSWORD", "TestAdminPass123!")

    async with async_session_maker() as s:
        uid = (
            await s.execute(text("SELECT id FROM users WHERE email = :e"), {"e": admin_email})
        ).scalar_one()
        await s.execute(
            text("SELECT set_config('app.user_id', :u, true)"), {"u": str(uid)}
        )
        await s.execute(
            text("UPDATE users SET is_email_verified = false WHERE id = :u"), {"u": str(uid)}
        )
        await s.commit()

    try:
        r = await client.post(
            "/api/v1/auth/login", json={"email": admin_email, "password": admin_password}
        )
        assert r.status_code == 200, r.text
        assert r.json()["access_token"]
    finally:
        async with async_session_maker() as s:
            await s.execute(
                text("SELECT set_config('app.user_id', :u, true)"), {"u": str(uid)}
            )
            await s.execute(
                text("UPDATE users SET is_email_verified = true WHERE id = :u"), {"u": str(uid)}
            )
            await s.commit()
