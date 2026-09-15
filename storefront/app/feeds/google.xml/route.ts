import { NextResponse } from "next/server";

/**
 * Google Merchant Center product feed (XML).
 *
 * Built from the live catalog only — no static fallback — so the feed never
 * advertises offline placeholder data. Fetch with a Content API-free schedule
 * (Merchant Center → Products → Feed URL).
 *
 * Fields intentionally omitted because the platform does not track them yet
 * (adding fake values violates Merchant Center policies):
 *   - gtin / mpn → <g:identifier_exists> is set to "no" instead.
 *   - shipping   → storefront offers free shipping over ₹999, flat otherwise;
 *                  configure shipping services in Merchant Center rather than
 *   -             per-item here until the API exposes per-product rates.
 */
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elektrix.in";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FeedProduct {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  brand?: string;
  price: number; // paise
  effective_price?: number; // paise
  mrp?: number; // paise
  images?: string[];
  stock?: { in_stock: boolean };
}

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const plainText = (html: string | undefined) =>
  html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

export async function GET() {
  const items: FeedProduct[] = [];
  const pageSize = 100;
  // Up to 5 pages (500 products) — plenty for the current catalog size.
  for (let page = 1; page <= 5; page++) {
    try {
      const res = await fetch(`${API_URL}/store/products?page=${page}&page_size=${pageSize}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as { items?: FeedProduct[] };
      const batch = Array.isArray(data.items) ? data.items : [];
      items.push(...batch);
      if (batch.length < pageSize) break;
    } catch {
      break;
    }
  }

  const entries = items
    .map((p) => {
      const price = ((p.effective_price ?? p.price) / 100).toFixed(2);
      const link = `${SITE_URL}/product/${p.slug || p.id}`;
      const image = p.images?.[0];
      const description = plainText(p.description) || p.name;
      const availability = p.stock ? (p.stock.in_stock ? "in stock" : "out of stock") : "in stock";
      return `  <item>
    <g:id>${xmlEscape(p.slug || p.id)}</g:id>
    <g:title>${xmlEscape(p.name.slice(0, 150))}</g:title>
    <g:description>${xmlEscape(description.slice(0, 5000))}</g:description>
    <g:link>${xmlEscape(link)}</g:link>
${image ? `    <g:image_link>${xmlEscape(image)}</g:image_link>\n` : ""}    <g:condition>new</g:condition>
    <g:availability>${availability}</g:availability>
    <g:price>${price} INR</g:price>
    ${p.brand ? `<g:brand>${xmlEscape(p.brand)}</g:brand>\n` : ""}    <g:identifier_exists>no</g:identifier_exists>
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>ELEKTRIX — Product Feed</title>
  <link>${xmlEscape(SITE_URL)}</link>
  <description>Product feed for Google Merchant Center</description>
${entries}
</channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
