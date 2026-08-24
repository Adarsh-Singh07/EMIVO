import re

path = "/opt/elektrix/admin/src/app/(dashboard)/layout.tsx"
with open(path, "r") as f:
    content = f.read()

old_links = """  {
    label: "Commerce",
    links: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/products", label: "Products", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/coupons", label: "Coupons", icon: Tag },
    ],
  },"""

new_links = """  {
    label: "Commerce",
    links: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/products", label: "Products", icon: Package },
      { href: "/products/categories", label: "Categories & Brands", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/coupons", label: "Coupons", icon: Tag },
    ],
  },"""

content = content.replace(old_links, new_links)
with open(path, "w") as f:
    f.write(content)
