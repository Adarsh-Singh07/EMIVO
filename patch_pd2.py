with open("storefront/components/site/ProductDetail.tsx", "r") as f:
    pd = f.read()

pd = pd.replace('-mx-4 px-4 sm:mx-0 sm:px-0', '')
with open("storefront/components/site/ProductDetail.tsx", "w") as f:
    f.write(pd)
