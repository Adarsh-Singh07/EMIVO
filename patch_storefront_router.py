import re

path = "/opt/elektrix/apps/api/modules/storefront/router.py"
with open(path, "r") as f:
    content = f.read()

old_config = """@router.get("/config")
async def store_config():
    \"\"\"Public endpoint: returns store configuration the frontend needs.
    Notably exposes whether online payment is available (Cashfree configured).
    Never exposes secrets.\"\"\"
    from core.config import settings
    cashfree_configured = bool(
        settings.payment_provider == "cashfree"
        and settings.cashfree_client_id
        and settings.cashfree_client_secret.get_secret_value()
    )
    return {
        "online_payment_available": cashfree_configured,
        "payment_provider": settings.payment_provider,
        "cod_enabled": settings.cod_enabled,
        "cod_fee_paise": settings.cod_fee_paise,
        "flat_shipping_paise": settings.flat_shipping_paise,
        "free_shipping_threshold_paise": settings.free_shipping_threshold,
        "currency": "INR",
        "storefront_url": settings.storefront_url,
    }"""

new_config = """@router.get("/config")
async def store_config(session: AsyncSession = Depends(optional_db_context)):
    \"\"\"Public endpoint: returns store configuration the frontend needs.
    Notably exposes whether online payment is available (Cashfree configured).
    Never exposes secrets.\"\"\"
    from core.config import settings
    from modules.orders.service import get_store_settings
    
    cashfree_configured = bool(
        settings.payment_provider == "cashfree"
        and settings.cashfree_client_id
        and settings.cashfree_client_secret.get_secret_value()
    )
    
    try:
        db_cfg = await get_store_settings(session)
    except Exception:
        db_cfg = {}
        
    return {
        "online_payment_available": cashfree_configured,
        "payment_provider": settings.payment_provider,
        "cod_enabled": db_cfg.get("cod_enabled", settings.cod_enabled),
        "cod_fee_paise": db_cfg.get("cod_fee_paise", settings.cod_fee_paise),
        "flat_shipping_paise": db_cfg.get("flat_shipping_paise", settings.flat_shipping_paise),
        "free_shipping_threshold_paise": db_cfg.get("free_shipping_threshold_paise", settings.free_shipping_threshold),
        "currency": "INR",
        "storefront_url": settings.storefront_url,
    }"""

content = content.replace(old_config, new_config)
with open(path, "w") as f:
    f.write(content)
