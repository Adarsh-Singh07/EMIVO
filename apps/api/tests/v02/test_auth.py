"""Auth flows: register/login, refresh rotation + replay detection, password
reset (Redis token + outbox email event), change password, and authorization
basics."""
import os
import uuid

import pytest

from conftest import register_and_login, admin_login

pytestmark = pytest.mark.asyncio


async def test_register_login_me(client):
    user = await register_and_login(client, uuid.uuid4().int % 90000 + 10)
    r = await client.get("/api/v1/users/me", headers=user["headers"])
    assert r.status_code == 200
    assert r.json()["email"] == user["email"]


async def test_register_duplicate_email_rejected(client):
    user = await register_and_login(client, 777001)
    r = await client.post("/api/v1/auth/register", json={
        "email": user["email"], "password": "Passw0rd!123",
        "first_name": "Dup", "last_name": "User",
    })
    assert r.status_code in (400, 409)


async def test_refresh_rotation_and_replay_detection(client):
    user = await register_and_login(client, 777002)

    # Rotate: old refresh token must stop working, new one issued
    r1 = await client.post("/api/v1/auth/refresh", json={"refresh_token": user["refresh_token"]})
    assert r1.status_code == 200
    rotated = r1.json()

    r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": user["refresh_token"]})
    assert r2.status_code == 401  # replay detected

    # The family is revoked after replay — even the rotated token dies
    r3 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rotated["refresh_token"]})
    assert r3.status_code == 401


async def test_forgot_and_reset_password(client):
    user = await register_and_login(client, 777003)

    r = await client.post("/api/v1/auth/forgot-password", json={"email": user["email"]})
    assert r.status_code == 202
    # No user enumeration for unknown emails
    r = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 202

    # The reset email was enqueued through the outbox
    from sqlalchemy import text
    from core.database import async_session_maker
    async with async_session_maker() as s:
        row = (await s.execute(text("""
            SELECT payload FROM outbox_events
            WHERE type = 'auth.password_reset' AND payload->>'email' = :e
            ORDER BY created_at DESC LIMIT 1
        """), {"e": user["email"]})).scalar()
    assert row and row.get("token")

    r = await client.post("/api/v1/auth/reset-password", json={
        "token": row["token"], "new_password": "NewPassw0rd!456",
    })
    assert r.status_code == 200

    # Old sessions revoked; new password works
    r = await client.post("/api/v1/auth/login", json={"email": user["email"], "password": "Passw0rd!123"})
    assert r.status_code == 401
    r = await client.post("/api/v1/auth/login", json={"email": user["email"], "password": "NewPassw0rd!456"})
    assert r.status_code == 200


async def test_change_password(client):
    user = await register_and_login(client, 777004)
    r = await client.post("/api/v1/auth/change-password", headers=user["headers"], json={
        "current_password": "Passw0rd!123", "new_password": "Changed!Pass9",
    })
    assert r.status_code == 200
    r = await client.post("/api/v1/auth/login", json={"email": user["email"], "password": "Changed!Pass9"})
    assert r.status_code == 200


async def test_admin_roles_from_membership(client):
    admin = await admin_login(client)
    r = await client.get("/api/v1/admin/dashboard", headers=admin)
    assert r.status_code == 200
