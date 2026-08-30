import re

with open("storefront/app/checkout/page.tsx", "r") as f:
    content = f.read()

target = """        const init = await storeApi.initiatePayment({
          order_id: order.id,
          idempotency_key: newIdempotencyKey(),
        });
        const co = init.checkout;"""

replacement = """        const init = await storeApi.initiatePayment({
          order_id: order.id,
          idempotency_key: newIdempotencyKey(),
        });
        setPendingPayment({ order, paymentId: init.payment.id });
        const co = init.checkout;"""

content = content.replace(target, replacement)

with open("storefront/app/checkout/page.tsx", "w") as f:
    f.write(content)
print("Patched startPayment!")
