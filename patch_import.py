import re

with open("apps/api/modules/storefront/router.py", "r") as f:
    content = f.read()

target = "from fastapi import APIRouter, Query, Request, HTTPException"
replacement = "from fastapi import APIRouter, Query, Request, HTTPException, Depends\nfrom core.database import get_db_session"

# Or if the import line looks different:
if target in content:
    content = content.replace(target, replacement)
else:
    # Just insert it at the top
    content = "from fastapi import Depends\nfrom core.database import get_db_session\n" + content

with open("apps/api/modules/storefront/router.py", "w") as f:
    f.write(content)
print("Fixed imports")
