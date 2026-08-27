import re

with open("apps/api/modules/storefront/router.py", "r") as f:
    code = f.read()

new_code = code.replace("""    except Exception:
        return []""", "")

with open("apps/api/modules/storefront/router.py", "w") as f:
    f.write(new_code)
