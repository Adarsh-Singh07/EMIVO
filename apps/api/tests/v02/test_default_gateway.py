"""Single default payment gateway: admin-persisted choice > env > configured,
graceful fallback when the requested gateway has no keys, and /store/config
reporting. Customers no longer pick a gateway — the checkout follows this."""
import uuid

import pytest

from conftest import ADDRESS, add_to_cart, get_store_products, register_and_login

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Unit: PaymentService._default_gateway() priority order
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    ("admin_default", "env_default", "configured", "expected"),
    [
        # Admin choice wins over env (even in a mock env)
        ("cashfree", "mock", {"cashfree": True, "easebuzz": True}, "cashfree"),
        ("easebuzz", "cashfree", {"cashfree": True, "easebuzz": True}, "easebuzz"),
        # Admin unset -> env default (when it is a real, configured gateway)
        (None, "easebuzz", {"cashfree": True, "easebuzz": True}, "easebuzz"),
        # Admin choice unconfigured -> fall to env default
        ("cashfree", "easebuzz", {"cashfree": False, "easebuzz": True}, "easebuzz"),
        # Env named an unconfigured gateway -> any configured one (cashfree preferred)
        (None, "cashfree", {"cashfree": False, "easebuzz": True}, "easebuzz"),
        (None, "cashfree", {"cashfree": True, "easebuzz": True}, "cashfree"),
        # Explicit env "mock" is a dev/test signal: honored, NOT silently
        # switched to a live gateway (CI sets cashfree keys; tests rely on mock)
        (None, "mock", {"cashfree": True, "easebuzz": False}, "mock"),
        (None, "mock", {"cashfree": False, "easebuzz": True}, "mock"),
        (None, "mock", {"cashfree": False, "easebuzz": False}, "mock"),
    ],
)
async def test_default_gateway_priority(
    monkeypatch, admin_default, env_default, configured, expected
):
    import core.store
    from core.config import settings
    from modules.payments import service as pay_service
    from modules.payments.service import PaymentService

    monkeypatch.setattr(settings, "payment_provider", env_default)
    monkeypatch.setattr(
        pay_service, "_provider_configured",
        lambda name: configured.get(str(name).lower(), False),
    )

    async def fake_store_settings(session):
        return {"default_gateway": admin_default}

    monkeypatch.setattr(core.store, "get_store_settings", fake_store_settings)

    svc = PaymentService(None)
    assert await svc._default_gateway() == expected


# ---------------------------------------------------------------------------
# HTTP: admin store-settings validation + round-trip
# ---------------------------------------------------------------------------

async def test_admin_default_gateway_validation_and_round_trip(client, admin):
    # Invalid gateway names are rejected at the schema level
    r = await client.put(
        "/api/v1/admin/store-settings", headers=admin, json={"default_gateway": "paypal"}
    )
    assert r.status_code == 422, r.text

    # Uppercase input is normalized to the canonical lowercase key
    r = await client.put(
        "/api/v1/admin/store-settings", headers=admin, json={"default_gateway": "CASHFREE"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["default_gateway"] == "cashfree"

    r = await client.put(
        "/api/v1/admin/store-settings", headers=admin, json={"default_gateway": "easebuzz"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["default_gateway"] == "easebuzz"

    # Explicit null clears the override (back to env default)
    r = await client.put(
        "/api/v1/admin/store-settings", headers=admin, json={"default_gateway": None}
    )
    assert r.status_code == 200, r.text
    assert r.json()["default_gateway"] is None

    r = await client.get("/api/v1/admin/store-settings", headers=admin)
    assert r.status_code == 200
    assert r.json()["default_gateway"] is None


# ---------------------------------------------------------------------------
# HTTP: /store/config reports the effective default gateway
# ---------------------------------------------------------------------------

async def test_store_config_reports_default_gateway(client):
    cfg = (await client.get("/api/v1/store/config")).json()
    assert cfg["default_gateway"] in (None, "cashfree", "easebuzz")
    # The flag must agree with the value
    assert cfg["default_gateway_available"] is (cfg["default_gateway"] is not None)
    # If a default was chosen, that gateway's keys must actually be present
    if cfg["default_gateway"]:
        assert cfg[f"{cfg['default_gateway']}_available"] is True
    # Per-gateway availability flags are still exposed (admin status display)
    assert "cashfree_available" in cfg
    assert "easebuzz_available" in cfg


async def test_unavailable_requested_gateway_503s_when_nothing_configured(
    client,
):
    """No gateway keys in this environment: explicitly requesting an
    unconfigured gateway must fall back, and with nothing configured to
    fall back to, surface a clean 503 instead of crashing."""
    cfg = (await client.get("/api/v1/store/config")).json()
    if cfg["cashfree_available"] or cfg["easebuzz_available"]:
        pytest.skip("gateways are configured here — CI must not hit live providers")

    buyer = await register_and_login(client, 600011)
    products = await get_store_products(client, in_stock=True)
    product = next(p for p in products["items"] if p["stock"]["available"] >= 1)
    await add_to_cart(client, buyer, product["id"], 1)
    r = await client.post(
        "/api/v1/orders/checkout",
        headers=buyer["headers"],
        json={"shipping_address": ADDRESS, "payment_method": "ONLINE"},
    )
    assert r.status_code == 201, r.text
    order = r.json()["order"]

    r = await client.post(
        "/api/v1/payments/initiate",
        headers=buyer["headers"],
        json={
            "order_id": order["id"],
            "provider": "CASHFREE",
            "idempotency_key": f"gw-{uuid.uuid4().hex}",
        },
    )
    assert r.status_code == 503, r.text
    assert r.json()["code"] == "PROVIDER_UNAVAILABLE"
