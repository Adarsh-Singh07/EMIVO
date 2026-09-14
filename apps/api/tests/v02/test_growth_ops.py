"""Growth/ops batch: marketing segments + broadcasts, WhatsApp off-switch,
IMAP inbound -> ticket processing."""
import os

import pytest
import redis.asyncio as aioredis
from sqlalchemy import text

pytestmark = pytest.mark.asyncio

MKT = "/api/v1/admin/marketing"


def _redis():
    return aioredis.from_url(os.environ["REDIS_URL"], decode_responses=True)


def _session():
    from core.database import async_session_maker
    return async_session_maker()


# ---------------------------------------------------------------------------
# Segments + broadcasts
# ---------------------------------------------------------------------------

async def test_segments_auth_boundary(client, buyer):
    r = await client.get(f"{MKT}/segments")
    assert r.status_code == 401
    r = await client.get(f"{MKT}/segments", headers=buyer["headers"])
    assert r.status_code == 403


async def test_segments_list_and_preview(client, admin):
    r = await client.get(f"{MKT}/segments", headers=admin)
    assert r.status_code == 200
    segs = {s["key"]: s for s in r.json()}
    assert set(segs) == {"failed_payments_30d", "no_order_60d", "big_spenders", "all_customers"}
    # Every count is staff-audited but must never include staff accounts.
    for s in segs.values():
        assert s["count"] >= 0

    r = await client.get(f"{MKT}/segments/all_customers/preview?limit=5", headers=admin)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["count"], int) and body["count"] >= 0
    assert isinstance(body["sample"], list)

    r = await client.get(f"{MKT}/segments/unknown/preview", headers=admin)
    assert r.status_code == 404


async def test_broadcast_two_step_with_coupon(client, admin, buyer):
    spec = {
        "segment": "all_customers",
        "subject": "Integration test broadcast",
        "message": "Hello! Here is 10% off your next order, just for you.",
        "confirm": False,
        "coupon": {
            "code": "TESTBC10",
            "discount_type": "PERCENTAGE",
            "discount_value": 10,
            "min_order_amount": None,
            "end_date": None,
        },
    }
    # Step 1: preview (no side effects)
    r = await client.post(f"{MKT}/broadcasts", headers=admin, json=spec)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["confirm_required"] is True
    assert body["count"] >= 1
    assert body["coupon_code"] == "TESTBC10"

    async with _session() as session:
        before_events = (await session.execute(text(
            "SELECT COUNT(*) FROM outbox_events WHERE type = 'marketing.broadcast'"
        ))).scalar()
        coupon_exists = (await session.execute(text(
            "SELECT 1 FROM coupons WHERE code = 'TESTBC10'"
        ))).scalar()
    assert coupon_exists is None  # preview must not create the coupon

    # Step 2: confirmed send creates the coupon + outbox events
    r = await client.post(f"{MKT}/broadcasts", headers=admin, json={**spec, "confirm": True})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "queued"
    assert r.json()["queued"] >= 1

    async with _session() as session:
        coupon = (await session.execute(text(
            "SELECT discount_type::text, discount_value FROM coupons WHERE code = 'TESTBC10'"
        ))).first()
        assert coupon is not None and coupon[0] == "PERCENTAGE" and coupon[1] == 10
        after_events = (await session.execute(text(
            "SELECT COUNT(*) FROM outbox_events WHERE type = 'marketing.broadcast'"
        ))).scalar()
        buyer_event = (await session.execute(text(
            "SELECT payload->>'subject' FROM outbox_events "
            "WHERE type = 'marketing.broadcast' AND payload->>'email' = :e LIMIT 1"
        ), {"e": buyer["email"]})).scalar()
        # Clean up coupon so reruns behave the same
        await session.execute(text("DELETE FROM coupons WHERE code = 'TESTBC10'"))
        await session.commit()

    assert after_events > before_events
    assert buyer_event == "Integration test broadcast"

    # Per-user campaign dedupe: identical re-send queues nothing new.
    r = await client.post(f"{MKT}/broadcasts", headers=admin, json={**spec, "confirm": True})
    assert r.status_code == 200
    assert r.json()["queued"] == 0


async def test_broadcast_rejects_bad_segment(client, admin):
    r = await client.post(f"{MKT}/broadcasts", headers=admin, json={
        "segment": "nope", "subject": "Valid subject", "message": "A valid long message.",
        "confirm": True,
    })
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# WhatsApp (env-gated)
# ---------------------------------------------------------------------------

async def test_whatsapp_off_by_default():
    from modules.notifications.whatsapp import get_whatsapp_provider, maybe_send_order_whatsapp
    assert get_whatsapp_provider() is None
    assert await maybe_send_order_whatsapp(None, "order.shipped", {"user_id": "x"}) is None


# ---------------------------------------------------------------------------
# IMAP inbound -> tickets
# ---------------------------------------------------------------------------

def _make_msg(from_addr, to_addr, subject, body, msg_id="<test-1@x>"):
    return {
        "message_id": msg_id,
        "subject": subject,
        "from": from_addr,
        "to": [to_addr],
        "body": body,
    }


async def test_parse_message_rfc822():
    from apps.workers.inbound import parse_message
    raw = (
        b"From: Buyer <buyer@example.com>\r\n"
        b"To: support@elektrix.in\r\n"
        b"Subject: =?utf-8?q?Where_is_my_order?=\r\n"
        b"Message-ID: <abc-123@x>\r\n"
        b"Content-Type: text/plain; charset=utf-8\r\n\r\n"
        b"My order has not arrived yet.\r\n"
    )
    msg = parse_message(raw)
    assert msg is not None
    assert msg["from"] == "buyer@example.com"
    assert msg["subject"] == "Where is my order"
    assert "not arrived" in msg["body"]


async def test_inbound_message_routing(client, buyer):
    from apps.workers.inbound import process_inbound_message
    rds = _redis()

    # Loop guard: our own domain
    action = await process_inbound_message(
        None, rds, _make_msg("no-reply@elektrix.in", "support@elektrix.in", "hi", "x"))
    assert action == "loop"

    # Not a monitored alias
    action = await process_inbound_message(
        None, rds, _make_msg("x@example.com", "hello@elektrix.in", "hi", "x"))
    assert action == "not-monitored"

    # Unknown sender: no account is auto-created
    async with _session() as session:
        action = await process_inbound_message(
            session, rds,
            _make_msg("stranger@example.com", "support@elektrix.in", "hi", "hello there"))
    assert action == "no-user"

    # Registered buyer -> new ticket with INC number
    async with _session() as session:
        action = await process_inbound_message(
            session, rds,
            _make_msg(buyer["email"], "support@elektrix.in",
                      "Where is my order?", "It has not arrived yet.",
                      msg_id="<inbound-1@x>"))
        await session.commit()
    assert action == "ticket"
    async with _session() as session:
        t = (await session.execute(text(
            "SELECT ticket_number, subject FROM support_tickets st "
            "JOIN users u ON u.id = st.user_id WHERE u.email = :e "
            "ORDER BY st.created_at DESC LIMIT 1"
        ), {"e": buyer["email"]})).first()
    assert t is not None and t[0].startswith("INC") and "[Email]" in t[1]

    # Same buyer mails again while the ticket is open -> appended, not duplicated
    async with _session() as session:
        action = await process_inbound_message(
            session, rds,
            _make_msg(buyer["email"], "support@elektrix.in",
                      "Re: Where is my order?", "Any update on my order?",
                      msg_id="<inbound-2@x>"))
        await session.commit()
    assert action == "replied"

    # Same Message-ID again -> duplicate
    async with _session() as session:
        action = await process_inbound_message(
            session, rds,
            _make_msg(buyer["email"], "support@elektrix.in",
                      "Where is my order?", "It has not arrived yet.",
                      msg_id="<inbound-1@x>"))
    assert action == "duplicate"

    await rds.aclose()
