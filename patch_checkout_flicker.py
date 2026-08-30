with open("storefront/app/checkout/page.tsx", "r") as f:
    content = f.read()

target = """      if (response.payment_required) {
        // Track the order immediately; while payment is open/completed we keep
        // pendingPayment set so the UI shows the retry state until the
        // verify-success call confirms.
        setPlacedOrder(response.order);
        setPendingPayment({ order: response.order, paymentId: response.payment_id || "" });
        await startPayment(response.order, response.payment_id || "", false);
      }"""

replacement = """      if (response.payment_required) {
        // DO NOT set placedOrder or pendingPayment here to avoid flickering 
        // to the "Payment not completed" screen while we wait for the 
        // payment gateway URL (which takes 2-3s). We will stay on the 
        // loading spinner instead!
        await startPayment(response.order, response.payment_id || "", false);
      }"""

content = content.replace(target, replacement)

target2 = """          if (co.checkout_url) {
            window.location.href = co.checkout_url;
            await new Promise(() => {}); // block to prevent UI flicker while redirecting
            return;
          }"""

# no change to target2, just wanted to check it exists

with open("storefront/app/checkout/page.tsx", "w") as f:
    f.write(content)
print("Patched checkout flicker 1!")
