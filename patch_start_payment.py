with open("storefront/app/checkout/page.tsx", "r") as f:
    content = f.read()

target = """          if (co.checkout_url) {
            window.location.href = co.checkout_url;
            return;
          }"""

replacement = """          if (co.checkout_url) {
            window.location.href = co.checkout_url;
            await new Promise(() => {}); // block to prevent UI flicker while redirecting
            return;
          }"""

content = content.replace(target, replacement)

with open("storefront/app/checkout/page.tsx", "w") as f:
    f.write(content)
print("Patched startPayment flicker!")
