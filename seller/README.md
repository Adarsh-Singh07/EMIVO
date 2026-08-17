# ELEKTRIX Seller Portal — sell.elektrix.in

**Status:** Planned for v1.1. This folder is a placeholder.

## What it will be

A seller onboarding and management portal where third-party vendors can:
- Register their shop and list products on the ELEKTRIX marketplace
- Manage inventory, pricing, and orders
- View sales analytics and payouts
- Handle returns and customer support

## Why it's not in v0.2

The v0.2 brief explicitly scoped out the sell marketplace (`sell.elektrix.in`).
The multi-tenant schema (businesses, RLS per business, `app.role` GUC) is already
seller-ready — when the seller portal ships, each vendor gets a `business` row and
their own data isolation. No schema changes needed.

## When v1.1 starts

Create a Next.js app here with:
- `package.json` (name: `@elektrix/seller`)
- `next.config.js` (standalone output, `NEXT_PUBLIC_API_URL` env)
- `src/app/` — seller routes
- `src/lib/api-client.ts` — points at the same API (`api.elektrix.in`)
- Vercel project: point `sell.elektrix.in` at this folder
