"""Create sellers table, add seller_id to products, seed Apna Enterprises, and migrate products."""

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
    print("[1] Creating sellers table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sellers (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            business_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(50),
            city VARCHAR(100),
            pincode VARCHAR(20),
            address TEXT,
            gstin VARCHAR(50),
            commission_rate NUMERIC(5, 2) DEFAULT 0.0,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            rating NUMERIC(3, 2) DEFAULT 4.90,
            rating_count INTEGER DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    print("[2] Adding seller_id to products...")
    cur.execute("""
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS seller_id VARCHAR(36) REFERENCES sellers(id);
    """)

    print("[3] Adding status and requested_by_seller_id to categories...")
    cur.execute("""
        ALTER TABLE categories 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APPROVED',
        ADD COLUMN IF NOT EXISTS requested_by_seller_id VARCHAR(36) REFERENCES sellers(id);
        
        UPDATE categories SET status = 'APPROVED' WHERE status IS NULL;
    """)

    print("[4] Inserting or updating Apna Enterprises seller...")
    cur.execute("SELECT id FROM sellers WHERE email = %s OR business_name = %s;", ('admin@elektrix.in', 'Apna Enterprises'))
    row = cur.fetchone()
    if row:
        apna_seller_id = row[0]
        cur.execute("""
            UPDATE sellers 
            SET business_name = 'Apna Enterprises', 
                name = 'Admin / Apna Enterprises', 
                email = 'admin@elektrix.in',
                city = 'Gopalganj',
                pincode = '841428',
                status = 'ACTIVE'
            WHERE id = %s;
        """, (apna_seller_id,))
    else:
        apna_seller_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO sellers (id, name, business_name, email, phone, city, pincode, address, status, rating, rating_count)
            VALUES (%s, 'Admin / Apna Enterprises', 'Apna Enterprises', 'admin@elektrix.in', '+918092024066', 'Gopalganj', '841428', 'Main Market, Gopalganj, Bihar', 'ACTIVE', 4.90, 150);
        """, (apna_seller_id,))

    print(f"    Apna Enterprises Seller ID: {apna_seller_id}")

    print("[5] Migrating all products to Apna Enterprises seller...")
    cur.execute("""
        UPDATE products 
        SET seller_id = %s 
        WHERE seller_id IS NULL;
    """, (apna_seller_id,))
    migrated_count = cur.rowcount
    print(f"    Migrated {migrated_count} products to Apna Enterprises.")

    conn.commit()
    print("[SUCCESS] Database migration for sellers & categories completed!")

except Exception as err:
    conn.rollback()
    print(f"[ERROR] Migration failed: {err}")
    raise
finally:
    cur.close()
    conn.close()
