import re

with open("admin/src/app/(dashboard)/products/ProductEditor.tsx", "r") as f:
    content = f.read()

# 1. Add state
content = re.sub(
    r'const \[salePrice, setSalePrice\] = useState\(""\); // rupees',
    'const [salePrice, setSalePrice] = useState("");\n  const [hasOffer, setHasOffer] = useState(false);',
    content
)

# 2. Update loadProduct
content = re.sub(
    r'setSalePrice\(paiseToRupeeInput\(p\.sale_price\)\);',
    'setSalePrice(paiseToRupeeInput(p.sale_price));\n      setHasOffer(p.sale_price != null && p.sale_price > 0);',
    content
)

# 3. Update handleSave logic
# find payload.mrp = mrpPaise ?? null;
save_logic_old = """    const salePaise = rupeesToPaise(salePrice);
    payload.sale_price = salePaise ?? null;
    payload.offer_name = salePaise != null ? (offerName.trim() || null) : null;
    payload.offer_starts_at = salePaise != null ? localInputToIso(offerStarts) : null;
    payload.offer_ends_at = salePaise != null ? localInputToIso(offerEnds) : null;"""

save_logic_new = """    const salePaise = hasOffer ? rupeesToPaise(salePrice) : null;
    payload.sale_price = salePaise ?? null;
    payload.offer_name = hasOffer ? (offerName.trim() || null) : null;
    payload.offer_starts_at = hasOffer ? localInputToIso(offerStarts) : null;
    payload.offer_ends_at = hasOffer ? localInputToIso(offerEnds) : null;"""
content = content.replace(save_logic_old, save_logic_new)

# 4. Update validate logic
validate_logic_old = """    const salePaise = rupeesToPaise(salePrice);
    if (salePrice.trim() !== "" && salePaise == null) return "Sale price must be a valid amount in ₹.";
    if (salePaise != null && salePaise >= pricePaise) return "Sale price must be lower than the selling price.";
    if (offerStarts && offerEnds && new Date(offerStarts) >= new Date(offerEnds)) return "Offer end must be after offer start.";"""
validate_logic_new = """    const salePaise = hasOffer ? rupeesToPaise(salePrice) : null;
    if (hasOffer && salePrice.trim() !== "" && salePaise == null) return "Sale price must be a valid amount in ₹.";
    if (hasOffer && salePaise != null && salePaise >= pricePaise) return "Sale price must be lower than the selling price.";
    if (hasOffer && offerStarts && offerEnds && new Date(offerStarts) >= new Date(offerEnds)) return "Offer end must be after offer start.";"""
content = content.replace(validate_logic_old, validate_logic_new)

with open("admin/src/app/(dashboard)/products/ProductEditor.tsx", "w") as f:
    f.write(content)

