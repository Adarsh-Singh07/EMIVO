import re

with open("apps/api/modules/payments/service.py", "r") as f:
    content = f.read()

target = """        if order and order.status == OrderStatus.PENDING:
            order.status = OrderStatus.CANCELLED
            order.notes = (order.notes or "") + f"\\n[payment failed: {reason}]".strip()"""

replacement = """        if order and order.status == OrderStatus.PENDING:
            order.status = OrderStatus.PAYMENT_FAILED
            order.notes = (order.notes or "") + f"\\n[payment failed: {reason}]".strip()"""

content = content.replace(target, replacement)

with open("apps/api/modules/payments/service.py", "w") as f:
    f.write(content)
print("Patched backend status!")
