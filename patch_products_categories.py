import re

path = "/opt/elektrix/storefront/lib/products.ts"
with open(path, "r") as f:
    content = f.read()

old_cat = """export interface Category {
  slug: string;
  name: string;
  icon?: string; // name of lucide icon
}"""

new_cat = """export interface Category {
  slug: string;
  name: string;
  icon?: string; // name of lucide icon
  image_url?: string;
}"""
content = content.replace(old_cat, new_cat)

old_fetch = """export async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/store/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return CATEGORIES;
    const data = (await res.json()) as Array<{ slug: string; name: string }>;
    if (!Array.isArray(data) || data.length === 0) return CATEGORIES;
    return data
      .filter((c) => c && c.slug && c.name)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        icon: "Package", // generic fallback
      }));
  } catch (err) {
    return CATEGORIES;
  }
}"""

new_fetch = """export async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/store/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return CATEGORIES;
    const data = (await res.json()) as Array<{ slug: string; name: string; image_url?: string; children?: any[] }>;
    if (!Array.isArray(data) || data.length === 0) return CATEGORIES;
    return data
      .filter((c) => c && c.slug && c.name)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        icon: "Package",
        image_url: c.image_url,
      }));
  } catch (err) {
    return CATEGORIES;
  }
}"""
content = content.replace(old_fetch, new_fetch)

with open(path, "w") as f:
    f.write(content)
