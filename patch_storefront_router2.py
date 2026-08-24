import re

path = "/opt/elektrix/apps/api/modules/storefront/router.py"
with open(path, "r") as f:
    content = f.read()

old_config = """        "flat_shipping_paise": db_cfg.get("flat_shipping_paise", settings.flat_shipping_paise),
        "free_shipping_threshold_paise": db_cfg.get("free_shipping_threshold_paise", settings.free_shipping_threshold),
        "currency": "INR",
        "storefront_url": settings.storefront_url,
    }"""

new_config = """        "flat_shipping_paise": db_cfg.get("flat_shipping_paise", settings.flat_shipping_paise),
        "free_shipping_threshold_paise": db_cfg.get("free_shipping_threshold_paise", settings.free_shipping_threshold),
        "currency": "INR",
        "storefront_url": settings.storefront_url,
        "banner": db_cfg.get("banner"),
        "announcement": db_cfg.get("announcement"),
    }"""

content = content.replace(old_config, new_config)
with open(path, "w") as f:
    f.write(content)
