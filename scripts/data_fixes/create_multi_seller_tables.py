"""Create seller_listings table and backfill initial seller offers in Supabase."""

import os
import uuid
import psycopg2
from dotenv import load_dotenv

load_dotenv(".env")
db_url = os.environ.get("SYNC_DATABASE_URL")
if not db_url:
    raise RuntimeError("SYNC_DATABASE_URL not found in .env")

conn = psycopg2.connect(db_url)
conn.autocommit = False
cur = conn.cursor()

try:
    print("[1] Ensuring is_seller column on businesses...")
    cur.execute("""
        ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT TRUE;
    """)

    print("[2] Creating seller_listings table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS seller_listings (
            id VARCHAR(36) PRIMARY KEY,
            product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            seller_id VARCHAR(36) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            sku VARCHAR(100),
            price INTEGER NOT NULL,
            mrp INTEGER,
            stock INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            condition VARCHAR(50) NOT NULL DEFAULT 'NEW',
            estimated_delivery_days INTEGER NOT NULL DEFAULT 3,
            rating NUMERIC(3, 2) NOT NULL DEFAULT 4.80,
            rating_count INTEGER NOT NULL DEFAULT 24,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS ix_seller_listings_product ON seller_listings (product_id);
        CREATE INDEX IF NOT EXISTS ix_seller_listings_seller ON seller_listings (seller_id);
        CREATE INDEX IF NOT EXISTS ix_seller_listings_price ON seller_listings (product_id, price, is_active);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_product ON seller_listings (seller_id, product_id);
    """)

    print("[3] Resolving primary ELEKTRIX business...")
    cur.execute("SELECT id FROM businesses WHERE name = 'ELEKTRIX' LIMIT 1;")
    row = cur.fetchone()
    if not row:
        raise RuntimeError("ELEKTRIX business not found")
    elektrix_business_id = row[0]

    cur.execute("UPDATE businesses SET is_seller = TRUE WHERE id = %s;", (elektrix_business_id,))

    print("[4] Backfilling canonical seller listings for all products...")
    cur.execute("""
        SELECT p.id, p.price, p.mrp, p.sku, coalesce(i.on_hand, 25), (p.status = 'ACTIVE')
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id;
    """)
    prods = cur.fetchall()
    inserted_listings = 0
    for pid, price, mrp, sku, stock, is_active in prods:
        cur.execute("""
            INSERT INTO seller_listings (
                id, product_id, seller_id, sku, price, mrp, stock, is_active, 
                estimated_delivery_days, rating, rating_count
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (seller_id, product_id) DO UPDATE SET
                price = EXCLUDED.price,
                mrp = EXCLUDED.mrp,
                stock = EXCLUDED.stock,
                is_active = EXCLUDED.is_active;
        """, (
            str(uuid.uuid4()), pid, elektrix_business_id, sku or f"SKU-{pid[:8]}",
            price, mrp or price, max(stock, 10), is_active,
            2, 4.90, 150
        ))
        inserted_listings += 1

    print(f"    Synced {inserted_listings} primary seller listings for ELEKTRIX.")

    # [5] Provision sample verified marketplace sellers
    sample_sellers = [
        {
            "name": "Apex Retail India",
            "slug": "apex-retail-india",
            "email": "seller@apexretail.in",
            "phone": "+919876500001",
            "city": "Bengaluru",
            "rating": 4.80,
            "days": 3
        },
        {
            "name": "Sharma Electronics & E-Commerce",
            "slug": "sharma-ecommerce",
            "email": "seller@sharmaecom.in",
            "phone": "+919876500002",
            "city": "New Delhi",
            "rating": 4.75,
            "days": 4
        },
        {
            "name": "Global Direct Traders",
            "slug": "global-direct-traders",
            "email": "seller@globaldirect.in",
            "phone": "+919876500003",
            "city": "Mumbai",
            "rating": 4.85,
            "days": 2
        }
    ]

    seller_ids = []
    for s in sample_sellers:
        cur.execute("SELECT id FROM businesses WHERE slug = %s;", (s["slug"],))
        existing_s = cur.fetchone()
        if existing_s:
            s_id = existing_s[0]
        else:
            s_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO businesses (id, name, slug, is_active, is_seller, contact_email, contact_phone, settings)
                VALUES (%s, %s, %s, TRUE, TRUE, %s, %s, %s);
            """, (s_id, s["name"], s["slug"], s["email"], s["phone"], f'{{"city": "{s["city"]}"}}'))
        seller_ids.append((s_id, s))

    print(f"[5] Verified sample sellers ({len(seller_ids)} sellers ready).")

    # [6] Add competitive multi-seller offers on popular products (iPhone, Galaxy, Earbuds, Watches, etc.)
    cur.execute("SELECT id, name, price, mrp FROM products WHERE status = 'ACTIVE' LIMIT 15;")
    sample_prods = cur.fetchall()

    extra_offers = 0
    for idx, (pid, p_name, base_price, base_mrp) in enumerate(sample_prods):
        # Assign 1 or 2 alternate sellers
        s_idx = idx % len(seller_ids)
        seller_id, s_info = seller_ids[s_idx]
        
        # Give a slightly different price (-2% or +1%) to demonstrate lowest price logic
        price_modifier = 0.97 if idx % 2 == 0 else 0.99
        seller_price = int(base_price * price_modifier)

        cur.execute("""
            INSERT INTO seller_listings (
                id, product_id, seller_id, sku, price, mrp, stock, is_active,
                estimated_delivery_days, rating, rating_count
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s, %s)
            ON CONFLICT (seller_id, product_id) DO UPDATE SET
                price = EXCLUDED.price,
                stock = EXCLUDED.stock,
                is_active = EXCLUDED.is_active;
        """, (
            str(uuid.uuid4()), pid, seller_id, f"ALT-{pid[:6]}",
            seller_price, base_mrp or base_price, 15,
            s_info["days"], s_info["rating"], 42
        ))
        extra_offers += 1

        # For top 5 products, add a 3rd seller to show 3-way seller choice
        if idx < 5:
            s_idx3 = (idx + 1) % len(seller_ids)
            seller_id3, s_info3 = seller_ids[s_idx3]
            seller_price3 = int(base_price * 1.01)
            cur.execute("""
                INSERT INTO seller_listings (
                    id, product_id, seller_id, sku, price, mrp, stock, is_active,
                    estimated_delivery_days, rating, rating_count
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s, %s)
                ON CONFLICT (seller_id, product_id) DO UPDATE SET
                    price = EXCLUDED.price,
                    stock = EXCLUDED.stock,
                    is_active = EXCLUDED.is_active;
            """, (
                str(uuid.uuid4()), pid, seller_id3, f"ALT3-{pid[:6]}",
                seller_price3, base_mrp or base_price, 8,
                s_info3["days"], s_info3["rating"], 18
            ))
            extra_offers += 1

    print(f"[6] Inserted {extra_offers} competitive marketplace seller offers.")

    conn.commit()
    print("[SUCCESS] Multi-seller schema and sample data provisioned successfully!")

except Exception as err:
    conn.rollback()
    print(f"[ERROR] Migration failed: {err}")
    raise
finally:
    cur.close()
    conn.close()
