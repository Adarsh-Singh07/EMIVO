import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

old_interface = """  tags?: string[];
  variants?: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
  }>;
  media?: Array<{
    id: string;
    media_url: string;
    position: number;
  }>;"""

new_interface = """  tags?: string[];
  options?: any[];
  variants?: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
    attributes?: Record<string, string>;
    is_active?: boolean;
  }>;
  media?: Array<{
    id: string;
    media_url: string;
    position: number;
  }>;"""
content = content.replace(old_interface, new_interface)

with open(path, "w") as f:
    f.write(content)
