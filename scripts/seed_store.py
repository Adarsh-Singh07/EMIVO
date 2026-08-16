"""Seed the canonical ELEKTRIX store: business, admin owner, categories,
catalog with stock, festival coupons, and store settings.

Idempotent — safe to re-run (natural keys: business name, category slug,
product slug, coupon code). Run inside the api container:

    docker compose -f compose.prod.vm1.yaml run --rm api \
        python /app/scripts/seed_store.py

Requires ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD env (or prints a generated
password for first run). Prints STORE_BUSINESS_ID for .env.
"""
import asyncio
import os
import json
import secrets
import sys
import uuid as uuidlib
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/app/apps/api")

from passlib.hash import argon2
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

STORE_NAME = "ELEKTRIX"

CATEGORIES = [
    ("Audio", "audio", [
        ("Wireless Earbuds", "wireless-earbuds"),
    ]),
    ("Wearables", "wearables", [
        ("Smart Watches", "smart-watches"),
        ("Fitness Bands", "fitness-bands"),
    ]),
    ("Power & Charging", "power-charging", [
        ("Power Banks", "power-banks"),
        ("Chargers & Cables", "chargers-cables"),
    ]),
    ("Mobile Accessories", "mobile-accessories", [
        ("Phone Cases", "phone-cases"),
        ("Screen Protection", "screen-protection"),
    ]),
    ("Smart Home", "smart-home", [
        ("Smart Lighting", "smart-lighting"),
        ("Security Cameras", "security-cameras"),
    ]),
    ("Computing", "computing", [
        ("Keyboards & Mice", "keyboards-mice"),
        ("Laptop Accessories", "laptop-accessories"),
    ]),
]

U = "https://images.unsplash.com/{}?auto=format&fit=crop&w=900&q=80"

# (name, brand, cat_slug, price₹, mrp₹, featured, specs, images, tags)
PRODUCTS = [
    # Audio
    ("PulseBuds Pro ANC Earbuds", "ELEKTRIX", "wireless-earbuds", 2999, 4999, True,
     [("Driver", "13mm dynamic"), ("ANC", "Hybrid, up to 32dB"), ("Battery", "40h with case"), ("Water resistance", "IPX5"), ("Bluetooth", "5.3")],
     ["photo-1590658268037-6bf12165a8df", "photo-1606220945770-b5b6c2c55bf1"], ["earbuds", "tws", "anc"]),
    ("SoundCore Over-Ear Headphones", "ELEKTRIX", "wireless-earbuds", 4499, 7999, False,
     [("Driver", "40mm"), ("Battery", "60h"), ("Charging", "USB-C fast charge"), ("Weight", "254g")],
     ["photo-1583394838336-acd977736f90", "photo-1505740420928-5e560c06d30e"], ["headphones", "over-ear"]),
    ("BassGo Party Speaker 20W", "Nexon", "wireless-earbuds", 1999, 3499, False,
     [("Output", "20W RMS"), ("Battery", "12h"), ("Inputs", "Bluetooth 5.0 / AUX / microSD")],
     ["photo-1608043152269-423dbba4e7e1"], ["speaker", "bluetooth"]),
    # Wearables
    ("ChronoFit Smart Watch AMOLED", "ELEKTRIX", "smart-watches", 3499, 6999, True,
     [("Display", '1.43" AMOLED'), ("Battery", "7 days"), ("Calls", "Bluetooth calling"), ("Rating", "IP68"), ("Sensors", "HR, SpO2, sleep")],
     ["photo-1523275335684-37898b6baf30", "photo-1546868871-7041f2a55e12"], ["smartwatch", "amoled"]),
    ("TrackBand Lite Fitness Band", "Nexon", "fitness-bands", 1299, 2499, False,
     [("Display", '1.1" TFT'), ("Battery", "14 days"), ("Rating", "IP67")],
     ["photo-1576243345690-448cd247d2c5"], ["fitness", "band"]),
    ("ChronoFit Ultra GPS Watch", "ELEKTRIX", "smart-watches", 7999, 12999, False,
     [("Display", '1.5" AMOLED'), ("GPS", "Built-in dual-band"), ("Battery", "12 days"), ("Rating", "5ATM")],
     ["photo-1544117519-31a4b719223d"], ["smartwatch", "gps"]),
    # Power
    ("VoltCore 20000mAh Power Bank", "VoltCore", "power-banks", 1899, 2999, True,
     [("Capacity", "20000mAh"), ("Output", "22.5W fast charge"), ("Ports", "USB-C + 2×USB-A")],
     ["photo-1609091839311-d5365f9ff1c5", "photo-1615663245857-ac93bb7c39e7"], ["powerbank", "charging"]),
    ("VoltCore 10000mAh Slim Power Bank", "VoltCore", "power-banks", 999, 1799, False,
     [("Capacity", "10000mAh"), ("Output", "20W"), ("Weight", "210g")],
     ["photo-1615663245857-ac93bb7c39e7"], ["powerbank", "slim"]),
    ("TurboCharge 65W GaN Charger", "VoltCore", "chargers-cables", 1499, 2499, True,
     [("Output", "65W GaN II"), ("Ports", "2×USB-C + USB-A"), ("Includes", "USB-C cable")],
     ["photo-1583863788434-e58a36330cf0"], ["charger", "gan", "usb-c"]),
    ("BraidedFlex USB-C Cable 2m", "Nexon", "chargers-cables", 299, 599, False,
     [("Length", "2 metres"), ("Power", "100W PD"), ("Build", "Nylon braided")],
     ["photo-1588508065123-287b28e013da"], ["cable", "usb-c"]),
    ("MagSnap Wireless Charger 15W", "VoltCore", "chargers-cables", 1299, 2199, False,
     [("Output", "15W Qi2"), ("Cable", "1.5m included")],
     ["photo-1591290619762-cfa1cc9c0e88"], ["wireless", "charger"]),
    # Mobile accessories
    ("ArmorClear Case — Pixel Series", "ShieldOn", "phone-cases", 499, 999, False,
     [("Material", "TPU + PC hybrid"), ("Protection", "Military-grade drop"), ("Design", "Clear anti-yellowing")],
     ["photo-1601593346740-925612772716"], ["case", "pixel"]),
    ("FlexiGlass Screen Protector (2-pack)", "ShieldOn", "screen-protection", 399, 899, False,
     [("Hardness", "9H"), ("Fit", "Case-friendly"), ("Install", "Dust-free kit included")],
     ["photo-1605236453806-6ff36851218e"], ["screen", "protector"]),
    ("GripStand MagSafe Ring", "ShieldOn", "phone-cases", 349, 699, False,
     [("Compatibility", "MagSafe"), ("Grip", "360° rotating ring")],
     ["photo-1615947132595-1c5e7a4b9e2f"], ["grip", "magsafe"]),
    # Smart home
    ("GlowSmart Wi-Fi Bulb RGB (2-pack)", "HomeGlow", "smart-lighting", 899, 1699, True,
     [("Colors", "16M RGB + warm/cool white"), ("Control", "App + voice assistants"), ("Fit", "B22 + E27")],
     ["photo-1550985616-10810253b84d", "photo-1513506003901-1e6a229e2d15"], ["smartbulb", "rgb"]),
    ("GlowSmart LED Light Strip 5m", "HomeGlow", "smart-lighting", 1199, 2199, False,
     [("Length", "5 metres"), ("Colors", "16M RGBIC"), ("Control", "App + music sync")],
     ["photo-1550985616-10810253b84d"], ["lightstrip", "rgb"]),
    ("SecureView 2K Indoor Camera", "HomeGlow", "security-cameras", 2299, 3999, False,
     [("Resolution", "2K"), ("Night vision", "Color"), ("Storage", "microSD + cloud"), ("Audio", "2-way")],
     ["photo-1555215695-3004980ad54e"], ["camera", "security"]),
    ("SecureView Video Doorbell", "HomeGlow", "security-cameras", 3499, 5999, False,
     [("Resolution", "2K"), ("Field of view", "180°"), ("Power", "Rechargeable battery")],
     ["photo-1614850523459-c2f4c599c5ca"], ["doorbell", "security"]),
    # Computing
    ("TypeMaster Mechanical Keyboard", "Nexon", "keyboards-mice", 2799, 4999, True,
     [("Switches", "Hot-swappable red"), ("Layout", "75%"), ("Connection", "USB-C / 2.4G / BT"), ("Backlight", "RGB")],
     ["photo-1587829741301-dc798b83add3", "photo-1618384887929-16ec33fab9ef"], ["keyboard", "mechanical"]),
    ("GlidePro Wireless Mouse", "Nexon", "keyboards-mice", 1299, 2299, False,
     [("Sensor", "16000 DPI"), ("Buttons", "6 programmable"), ("Battery", "70h")],
     ["photo-1527864550417-7fd91fc51a46"], ["mouse", "wireless"]),
    ("LaptopStand Aluminium Pro", "ELEKTRIX", "laptop-accessories", 1799, 2999, False,
     [("Material", "Aluminium"), ("Adjustable", "6 heights"), ("Fits", '10"-17" laptops')],
     ["photo-1527814050087-3793815479db"], ["stand", "laptop"]),
    ("SleeveCase 15.6\" Water-Repellent", "ELEKTRIX", "laptop-accessories", 799, 1499, False,
     [("Size", '15.6"'), ("Material", "Water-repellent fabric"), ("Extras", "Accessory pocket")],
     ["photo-1544816155-12df9643f363"], ["sleeve", "laptop"]),
    ("USB-C 7-in-1 Hub", "VoltCore", "laptop-accessories", 2199, 3799, False,
     [("Ports", "HDMI 4K, 2×USB 3.0, SD, microSD, PD 100W"), ("Cable", "Built-in")],
     ["photo-1625723044792-44de16ccb4e9"], ["hub", "usb-c"]),
    # One hero offer product
    ("PulseBuds Air Lite", "ELEKTRIX", "wireless-earbuds", 1499, 2999, True,
     [("Driver", "12mm"), ("Battery", "30h with case"), ("Bluetooth", "5.3"), ("Water resistance", "IPX4")],
     ["photo-1590658268037-6bf12165a8df"], ["earbuds", "budget"]),
]

# code, type, value, min_order₹, max_disc₹, usage_limit, per_user, festival window
COUPONS = [
    ("WELCOME10", "PERCENTAGE", 10, 200000, 50000, None, 1, None),
    ("FESTIVE15", "PERCENTAGE", 15, 500000, 150000, 500, 1, ("2026-08-18", "2026-09-05")),
    ("FLAT200", "FIXED_AMOUNT", 20000, 300000, None, 200, 2, None),
]


def slugify(value: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


async def main() -> None:
    engine = create_async_engine(
        os.environ["DATABASE_URL"],
        connect_args={"statement_cache_size": 0},
    )
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as s:
        # ---- Canonical store business ------------------------------------
        row = (await s.execute(
            text("SELECT id FROM businesses WHERE name = :n AND deleted_at IS NULL LIMIT 1"),
            {"n": STORE_NAME},
        )).scalar()
        if row:
            business_id = str(row)
            print(f"[seed] store business exists: {business_id}")
        else:
            business_id = secrets.token_hex(16)
            business_id = str(uuidlib.uuid4())
            await s.execute(text("""
                INSERT INTO businesses (id, name, slug, is_active, settings, contact_email)
                VALUES (:id, :name, :slug, true, '{}'::jsonb, 'support@elektrix.in')
            """), {"id": business_id, "name": STORE_NAME, "slug": "elektrix-store"})
            print(f"[seed] created store business: {business_id}")
        await s.execute(text("SELECT set_config('app.business_id', :bid, false)"), {"bid": business_id})
        await s.commit()

        # ---- Admin owner ---------------------------------------------------
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@elektrix.in").lower()
        admin_pw = os.environ.get("ADMIN_INITIAL_PASSWORD")
        existing_admin = (await s.execute(
            text("SELECT id FROM users WHERE email = :e"), {"e": admin_email}
        )).scalar()
        generated = None
        if not existing_admin:
            if not admin_pw:
                admin_pw = secrets.token_urlsafe(12)
                generated = admin_pw
            await s.execute(text("""
                INSERT INTO users (id, email, password_hash, first_name, last_name,
                                   is_active, is_email_verified, mfa_enabled)
                VALUES (:id, :e, :h, 'Store', 'Admin', true, true, false)
            """), {
                "id": secrets.uuid4().hex if False else __import__("uuid").uuid4().__str__(),
                "e": admin_email, "h": argon2.hash(admin_pw),
            })
            existing_admin = (await s.execute(
                text("SELECT id FROM users WHERE email = :e"), {"e": admin_email}
            )).scalar()
            print(f"[seed] created admin user {admin_email}")
        admin_id = str(existing_admin)

        # owner membership (upsert)
        member = (await s.execute(text("""
            SELECT id FROM business_members WHERE business_id = :b AND user_id = :u LIMIT 1
        """), {"b": business_id, "u": admin_id})).scalar()
        if not member:
            await s.execute(text("""
                INSERT INTO business_members (id, business_id, user_id, role)
                VALUES (:i, :b, :u, 'owner')
            """), {"i": str(uuidlib.uuid4()), "b": business_id, "u": admin_id})
            print("[seed] granted owner membership")
        await s.commit()

        # ---- Categories -----------------------------------------------------
        cat_ids = {}
        for name, slug, children in CATEGORIES:
            existing = (await s.execute(
                text("SELECT id FROM categories WHERE business_id = :b AND slug = :s"),
                {"b": business_id, "s": slug},
            )).scalar()
            if not existing:
                await s.execute(text("""
                    INSERT INTO categories (id, business_id, name, slug)
                    VALUES (:i, :b, :n, :s)
                """), {"i": str(uuidlib.uuid4()), "b": business_id, "n": name, "s": slug})
            cat_ids[slug] = str((await s.execute(
                text("SELECT id FROM categories WHERE business_id = :b AND slug = :s"),
                {"b": business_id, "s": slug},
            )).scalar())
            # children (leaf categories the products attach to)
            for child_name, child_slug in children:
                await s.execute(text("""
                    INSERT INTO categories (id, business_id, name, slug, parent_id)
                    VALUES (:i, :b, :n, :s, :p)
                    ON CONFLICT DO NOTHING
                """), {"i": str(uuidlib.uuid4()), "b": business_id,
                       "n": child_name, "s": child_slug, "p": cat_ids[slug]})
                cat_ids[child_slug] = str((await s.execute(
                    text("SELECT id FROM categories WHERE business_id = :b AND slug = :s"),
                    {"b": business_id, "s": child_slug},
                )).scalar())
        await s.commit()
        print(f"[seed] categories ready ({len(cat_ids)})")

        # ---- Products + media + inventory -----------------------------------
        festival_start = datetime(2026, 8, 18, tzinfo=timezone.utc)
        festival_end = datetime(2026, 9, 5, tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)

        for idx, (name, brand, cat, price, mrp, featured, specs, images, tags) in enumerate(PRODUCTS):
            price_p, mrp_p = price * 100, mrp * 100
            slug = slugify(name)
            existing = (await s.execute(
                text("SELECT id FROM products WHERE business_id = :b AND slug = :s"),
                {"b": business_id, "s": slug},
            )).scalar()
            if existing:
                pid = str(existing)
            else:
                pid = str(uuidlib.uuid4())
                # Festival offers on ~40% of the catalog, within the window
                on_offer = idx % 5 in (0, 2) and price >= 999
                sale = int(price_p * 0.85) if on_offer else None  # 15% festival discount
                await s.execute(text("""
                    INSERT INTO products (id, business_id, name, slug, description, price, mrp,
                        sale_price, offer_starts_at, offer_ends_at, brand, status, featured,
                        category_id, specs, tags, sku)
                    VALUES (:id, :b, :n, :s, :d, :p, :m, :sp, :os, :oe, :br, 'ACTIVE', :f, :c, :specs, :tags, :sku)
                """), {
                    "id": pid, "b": business_id, "n": name, "s": slug,
                    "d": f"{name} by {brand}. Genuine product with manufacturer warranty, "
                         "shipped from ELEKTRIX with easy returns.",
                    "p": price_p, "m": mrp_p, "sp": sale,
                    "os": festival_start if on_offer else None,
                    "oe": festival_end if on_offer else None,
                    "br": brand, "f": featured, "c": cat_ids[cat],
                    "specs": json.dumps([{"name": k, "value": v} for k, v in specs]),
                    "tags": json.dumps(tags),
                    "sku": f"ELX-{slug[:12].upper()}-{idx:03d}",
                })
                for pos, photo in enumerate(images):
                    await s.execute(text("""
                        INSERT INTO product_media (id, product_id, media_url, position, alt_text)
                        VALUES (:i, :p, :u, :pos, :alt)
                    """), {
                        "i": str(uuidlib.uuid4()), "p": pid,
                        "u": U.format(photo), "pos": pos, "alt": name,
                    })

            # inventory: varied stock, a couple of out-of-stock/low-stock rows
            stock = 0 if idx == 5 else (3 if idx % 7 == 3 else 20 + (idx * 7) % 60)
            await s.execute(text("""
                INSERT INTO inventory (id, product_id, business_id, on_hand, reserved, low_stock_threshold)
                VALUES (:i, :p, :b, :oh, 0, 5)
                ON CONFLICT (product_id) DO NOTHING
            """), {"i": str(uuidlib.uuid4()), "p": pid, "b": business_id, "oh": stock})
        await s.commit()
        print(f"[seed] products ready ({len(PRODUCTS)})")

        # ---- Coupons ----------------------------------------------------------
        for code, ctype, value, min_order_p, max_disc_p, usage_limit, per_user, window in COUPONS:
            exists = (await s.execute(
                text("SELECT id FROM coupons WHERE business_id = :b AND upper(code) = :c"),
                {"b": business_id, "c": code},
            )).scalar()
            if exists:
                continue
            start = end = None
            if window:
                start = datetime.fromisoformat(window[0]).replace(tzinfo=timezone.utc)
                end = datetime.fromisoformat(window[1]).replace(tzinfo=timezone.utc)
            await s.execute(text("""
                INSERT INTO coupons (id, business_id, code, description, discount_type,
                    discount_value, min_order_amount, max_discount_amount, usage_limit,
                    usage_count, per_user_limit, start_date, end_date, is_active)
                VALUES (:i, :b, :c, :d, :t, :v, :m, :md, :ul, 0, :pu, :sd, :ed, true)
            """), {
                "i": str(uuidlib.uuid4()), "b": business_id, "c": code,
                "d": f"{code} — festival campaign coupon",
                "t": ctype, "v": value, "m": min_order_p, "md": max_disc_p,
                "ul": usage_limit, "pu": per_user, "sd": start, "ed": end,
            })
        await s.commit()
        print(f"[seed] coupons ready ({len(COUPONS)})")

        # ---- Store settings -----------------------------------------------------
        await s.execute(text("""
            INSERT INTO business_settings (id, business_id, config)
            VALUES (:i, :b, '{}'::jsonb)
            ON CONFLICT (business_id) DO NOTHING
        """), {"i": str(uuidlib.uuid4()), "b": business_id})
        await s.commit()

    await engine.dispose()
    print()
    print(f"STORE_BUSINESS_ID={business_id}")
    if generated:
        print(f"ADMIN_EMAIL={admin_email}")
        print(f"ADMIN_INITIAL_PASSWORD={generated}   <-- save this now (shown once)")
    print("[seed] done")


if __name__ == "__main__":
    asyncio.run(main())
