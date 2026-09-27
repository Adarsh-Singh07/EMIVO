"""Media upload endpoint: authorization + validation guards. The happy path
needs real R2 credentials; here we pin the behavior that must hold without
them (401/403/400) and that validation runs before the storage check."""
import pytest

from conftest import register_and_login

pytestmark = pytest.mark.asyncio

TINY_PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


async def test_media_upload_requires_auth(client):
    r = await client.post(
        "/api/v1/media/upload",
        files={"file": ("test.png", TINY_PNG, "image/png")},
    )
    assert r.status_code == 401


async def test_media_upload_forbidden_for_customer(client):
    customer = await register_and_login(client, 810001)
    r = await client.post(
        "/api/v1/media/upload",
        files={"file": ("test.png", TINY_PNG, "image/png")},
        headers=customer["headers"],
    )
    assert r.status_code == 403


async def test_media_upload_rejects_bad_extension(client, admin):
    # SVG is deliberately excluded from the allowlist (stored-XSS vector).
    r = await client.post(
        "/api/v1/media/upload",
        files={"file": ("test.svg", b"<svg/>", "image/svg+xml")},
        headers=admin,
    )
    assert r.status_code == 400
    assert "Unsupported file type" in r.json()["detail"]


async def test_media_upload_rejects_content_type_mismatch(client, admin):
    r = await client.post(
        "/api/v1/media/upload",
        files={"file": ("test.png", TINY_PNG, "text/html")},
        headers=admin,
    )
    assert r.status_code == 400
    assert "does not match extension" in r.json()["detail"]
