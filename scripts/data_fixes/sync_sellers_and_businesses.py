import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(".env")
db_url = os.environ.get("SYNC_DATABASE_URL")
conn = psycopg2.connect(db_url)
conn.autocommit = False
cur = conn.cursor()

try:
    # Ensure businesses are also represented in sellers with identical UUIDs
    cur.execute("SELECT id, name, slug, contact_email, contact_phone FROM businesses WHERE id != %s;", ('7f2515ec-c52f-4f74-8b31-0c421de54dc6',))
    rows = cur.fetchall()
    for bid, bname, bslug, bemail, bphone in rows:
        cur.execute("""
            INSERT INTO sellers (id, name, business_name, email, phone, city, status, rating, rating_count)
            VALUES (%s, %s, %s, %s, %s, 'Bengaluru', 'ACTIVE', 4.85, 45)
            ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name;
        """, (bid, bname, bname, bemail or f"{bslug}@elektrix.in", bphone or "+919876543210"))

    # Also insert Apna Enterprises in businesses with settings = '{}'
    cur.execute("""
        INSERT INTO businesses (id, name, slug, is_active, is_seller, contact_email, contact_phone, settings)
        VALUES (%s, 'Apna Enterprises', 'apna-enterprises', TRUE, TRUE, 'admin@elektrix.in', '+918092024066', '{}'::json)
        ON CONFLICT (id) DO UPDATE SET name = 'Apna Enterprises';
    """, ('baa3a2a4-98f7-4501-a8a3-6d1cda4412de',))

    # Update seller_listings to point to Apna Enterprises
    cur.execute("""
        UPDATE seller_listings 
        SET seller_id = 'baa3a2a4-98f7-4501-a8a3-6d1cda4412de' 
        WHERE seller_id = '7f2515ec-c52f-4f74-8b31-0c421de54dc6';
    """)

    conn.commit()
    print("Synced sellers and businesses tables successfully!")
except Exception as e:
    conn.rollback()
    print("Error:", e)
    raise
finally:
    cur.close()
    conn.close()
