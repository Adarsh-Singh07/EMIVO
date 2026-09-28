"""Live duplicate check for the register form (read-only, rate-limited)."""
import pytest

from conftest import _run, register_and_login

pytestmark = pytest.mark.asyncio


async def test_availability_reflects_registration(client):
    n = 830001
    email = f"buyer{_run(n)}@example.com"
    phone = f"9{str(abs(n))[-9:].zfill(9)}"

    # Nothing registered yet
    r = await client.get(f"/api/v1/auth/availability?email={email}&phone={phone}")
    assert r.status_code == 200
    assert r.json() == {"email_taken": False, "phone_taken": False}

    # Register with exactly these identifiers
    buyer = await register_and_login(client, n)
    assert buyer["access_token"]

    # Both now taken
    r = await client.get(f"/api/v1/auth/availability?email={email}&phone={phone}")
    assert r.status_code == 200
    assert r.json() == {"email_taken": True, "phone_taken": True}

    # Email is case-insensitive
    r = await client.get(f"/api/v1/auth/availability?email={email.upper()}")
    assert r.json()["email_taken"] is True

    # Unrelated identifiers stay free
    r = await client.get("/api/v1/auth/availability?email=fresh@noperm.io&phone=9988877766")
    assert r.json() == {"email_taken": False, "phone_taken": False}
