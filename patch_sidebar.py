import re

path = "/opt/elektrix/admin/src/app/(dashboard)/layout.tsx"
with open(path, "r") as f:
    content = f.read()

old_nav = """  {
    label: "People",
    links: [
      { href: "/customers", label: "Customers", icon: UserCheck },
    ],
  },"""

new_nav = """  {
    label: "People",
    links: [
      { href: "/customers", label: "Customers", icon: UserCheck },
      { href: "/users", label: "Users", icon: Users },
    ],
  },"""

content = content.replace(old_nav, new_nav)
with open(path, "w") as f:
    f.write(content)
