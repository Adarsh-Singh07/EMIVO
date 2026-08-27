import os
import psycopg2

old_url = os.environ.get("STAGING_DATABASE_URL")
new_url = os.environ.get("DATABASE_URL")

conn_old = psycopg2.connect(old_url)
conn_new = psycopg2.connect(new_url)

cur_old = conn_old.cursor()
cur_new = conn_new.cursor()

cur_old.execute("SELECT id, product_id, business_id, on_hand, reserved, low_stock_threshold, variant_id FROM inventory WHERE on_hand > 0 OR reserved > 0")
rows = cur_old.fetchall()

print(f"Found {len(rows)} inventory records to migrate.")

for row in rows:
    cur_new.execute("SELECT id FROM products WHERE id = %s", (row[1],))
    if not cur_new.fetchone():
        continue # skip products that don't exist

    cur_new.execute("""
        INSERT INTO inventory (id, product_id, business_id, on_hand, reserved, low_stock_threshold, variant_id)
        VALUES (%s, %s, '1787603721327', %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET on_hand = EXCLUDED.on_hand, reserved = EXCLUDED.reserved
    """, (row[0], row[1], row[3], row[4], row[5], row[6]))

conn_new.commit()
print("Inventory migrated!")

cur_old.close()
cur_new.close()
conn_old.close()
conn_new.close()
