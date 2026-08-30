import re

with open("storefront/app/checkout/page.tsx", "r") as f:
    content = f.read()

target = """    if (paymentMethod === "ONLINE") {
      toast.error("Online payments are unavailable. Please try Cash on Delivery.");
      setPaymentMethod("COD");
      setPlacing(false);
      return;
    }"""

replacement = """    // if (paymentMethod === "ONLINE") {
    //   toast.error("Online payments are unavailable. Please try Cash on Delivery.");
    //   setPaymentMethod("COD");
    //   setPlacing(false);
    //   return;
    // }"""

content = content.replace(target, replacement)

with open("storefront/app/checkout/page.tsx", "w") as f:
    f.write(content)
print("Patched checkout page!")
