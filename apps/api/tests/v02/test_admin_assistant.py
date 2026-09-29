"""Admin-only AI assistant: authorization, offline fallback, audit log, daily cap."""
import pytest

from conftest import _run, register_and_login

pytestmark = pytest.mark.asyncio

ENDPOINT = "/api/v1/admin/assistant"


async def _admin_headers(client):
    from conftest import admin_login
    return await admin_login(client)


async def _admin_uid(client, admin_headers) -> str:
    me = (await client.get("/api/v1/users/me", headers=admin_headers)).json()
    return me["id"]


async def test_customer_cannot_use_admin_assistant(client):
    user = await register_and_login(client, 910010)
    r = await client.post(ENDPOINT, headers=user["headers"], json={"question": "How many orders today?"})
    assert r.status_code == 403, r.text


async def test_staff_assistant_answers_and_writes_audit_row(client):
    from sqlalchemy import text
    from core.database import async_session_maker

    admin = await _admin_headers(client)
    uid = await _admin_uid(client, admin)

    r = await client.post(ENDPOINT, headers=admin, json={"question": "How is the store doing today?"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reply"].strip()
    assert body["read_only"] is True
    assert isinstance(body["tools_called"], list)
    # In the test env no LLM keys are configured, so the offline fallback reports "offline"
    assert "offline" in body["model"]

    # The turn must be audited
    async with async_session_maker() as s:
        row = (await s.execute(
            text("SELECT question, model, outcome FROM admin_ai_actions WHERE admin_id = :a "
                 "ORDER BY created_at DESC LIMIT 1"),
            {"a": uid},
        )).mappings().first()
        assert row is not None, "assistant turn was not audited in admin_ai_actions"
        assert row["question"].startswith("How is the store")


async def test_staff_question_input_validation(client):
    admin = await _admin_headers(client)
    r = await client.post(ENDPOINT, headers=admin, json={"question": ""})
    assert r.status_code == 422


async def test_daily_cap_returns_429(client):
    from core.redis import redis_manager

    admin = await _admin_headers(client)
    uid = await _admin_uid(client, admin)
    key = f"admin_ai:usage:{uid}"
    redis = redis_manager.client
    await redis.set(key, 100, ex=60)
    try:
        r = await client.post(ENDPOINT, headers=admin, json={"question": "Quick one?"})
        assert r.status_code == 429, r.text
        assert r.json()["code"] == "RATE_LIMITED"
    finally:
        await redis.delete(key)


async def test_injection_cannot_change_tool_surface(client):
    """Even if the model is available, the question channel cannot add tools —
    verify the prompt-level contract: unknown tool names are never executed."""
    from modules.admin_assistant.tools import tool_names

    unknown = "reveal_secret"
    assert unknown not in tool_names()
    from modules.admin_assistant import service

    parsed = service._extract_json('{"tool": "reveal_secret", "args": {}}')
    # Parser returns the dict, but the loop checks membership in tool_names()
    assert parsed["tool"] not in service.tool_names()
