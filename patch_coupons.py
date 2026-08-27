import re

with open("apps/api/modules/storefront/router.py", "r") as f:
    code = f.read()

new_code = code.replace("""        query = text(\"\"\"
            SELECT code, description, discount_type, discount_value, min_order_amount, max_discount_amount 
            FROM coupons 
            WHERE is_active = true""", """        bid = await session.execute(text("SELECT current_setting('app.business_id', true)"))
        print("BUSINESS_ID IN COUPONS ROUTE:", bid.scalar())
        query = text(\"\"\"
            SELECT code, description, discount_type, discount_value, min_order_amount, max_discount_amount 
            FROM coupons 
            WHERE is_active = true""")

with open("apps/api/modules/storefront/router.py", "w") as f:
    f.write(new_code)
