with open("apps/api/modules/payments/router.py", "r") as f:
    content = f.read()

target = """    if eb_status == "SUCCESS":
        return RedirectResponse(
            url=f"{cfg.storefront_url}/account/orders?payment=success",
            status_code=303,
        )
    else:
        return RedirectResponse(
            url=f"{cfg.storefront_url}/account/orders?payment=failed",
            status_code=303,
        )"""

replacement = """    if eb_status == "SUCCESS":
        return RedirectResponse(
            url=f"{cfg.storefront_url}/account/orders?payment=success",
            status_code=303,
        )
    else:
        # Redirect back to checkout so the user can easily retry
        return RedirectResponse(
            url=f"{cfg.storefront_url}/checkout?error=payment_cancelled",
            status_code=303,
        )"""

content = content.replace(target, replacement)

with open("apps/api/modules/payments/router.py", "w") as f:
    f.write(content)
print("Patched backend router redirect!")
