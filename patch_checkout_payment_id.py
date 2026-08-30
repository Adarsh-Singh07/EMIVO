import re

with open("storefront/app/checkout/page.tsx", "r") as f:
    content = f.read()

target = "if (response.payment_required && response.payment_id) {"
replacement = "if (response.payment_required) {"

content = content.replace(target, replacement)

target2 = "setPendingPayment({ order: response.order, paymentId: response.payment_id });"
replacement2 = "setPendingPayment({ order: response.order, paymentId: response.payment_id || \"\" });"
content = content.replace(target2, replacement2)

target3 = "await startPayment(response.order, response.payment_id, false);"
replacement3 = "await startPayment(response.order, response.payment_id || \"\", false);"
content = content.replace(target3, replacement3)

with open("storefront/app/checkout/page.tsx", "w") as f:
    f.write(content)
print("Patched storefront to handle missing payment_id!")
