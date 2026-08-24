import re

path = "/opt/elektrix/admin/src/lib/store-api.ts"
with open(path, "r") as f:
    content = f.read()

old_interface = """  tags?: string[];
  category_id?: string | null;"""

new_interface = """  tags?: string[];
  options?: any[];
  category_id?: string | null;"""

content = content.replace(old_interface, new_interface)

old_variant = """  sku?: string;
  price: number;
}"""

new_variant = """  sku?: string;
  price: number;
  attributes?: Record<string, string>;
  is_active?: boolean;
}"""
content = content.replace(old_variant, new_variant)

with open(path, "w") as f:
    f.write(content)
