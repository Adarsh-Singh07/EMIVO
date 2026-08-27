with open("storefront/app/layout.tsx", "r") as f:
    layout = f.read()

# Add pb-24 to the main element if there is one, otherwise to the body.
# Let's check if there is a <main> wrapper.
