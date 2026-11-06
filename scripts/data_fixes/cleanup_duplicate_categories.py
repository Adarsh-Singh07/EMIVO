"""Cleanup duplicate categories and subcategories in Supabase PostgreSQL.

1. Trims and standardizes all category names into Title Case.
2. Identifies duplicates per (parent_id, lower(trim(name))).
3. Chooses a canonical category ID for each group.
4. Repoints products.category_id, categories.parent_id, and category_brands.category_id.
5. Safely removes the duplicate category rows.
6. Enforces a functional UNIQUE index to prevent duplicates forever.
"""

import os
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
    print("[1] Normalizing existing category names (trimming & title casing)...")
    cur.execute("""
        UPDATE categories
        SET name = trim(name)
        WHERE name <> trim(name);
    """)
    print(f"    Trimmed {cur.rowcount} category names.")

    # Specific fix for Home Appliances
    cur.execute("""
        UPDATE categories
        SET name = 'Home Appliances', slug = 'home-appliances'
        WHERE lower(trim(name)) = 'home appliances';
    """)

    print("[2] Finding duplicate category groups...")
    cur.execute("""
        SELECT 
            coalesce(parent_id, '00000000-0000-0000-0000-000000000000') AS p_id,
            lower(trim(name)) AS norm_name,
            array_agg(id) AS all_ids,
            count(*) AS cnt
        FROM categories
        GROUP BY coalesce(parent_id, '00000000-0000-0000-0000-000000000000'), lower(trim(name))
        HAVING count(*) > 1;
    """)
    dup_groups = cur.fetchall()
    print(f"    Found {len(dup_groups)} duplicate groups.")

    total_repointed_products = 0
    total_repointed_brands = 0
    total_deleted_cats = 0

    for p_id, norm_name, all_ids, cnt in dup_groups:
        # Determine best canonical ID: prefer ID that already has products
        cur.execute("""
            SELECT c.id, count(p.id) as prod_count, count(cb.category_id) as cb_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            LEFT JOIN category_brands cb ON cb.category_id = c.id
            WHERE c.id = ANY(%s)
            GROUP BY c.id
            ORDER BY count(p.id) DESC, count(cb.category_id) DESC, c.id ASC
            LIMIT 1;
        """, (all_ids,))
        canonical_id = cur.fetchone()[0]
        duplicate_ids = [cid for cid in all_ids if cid != canonical_id]

        print(f"    Group '{norm_name}': Canonical ID={canonical_id}, removing {len(duplicate_ids)} duplicates.")

        # Re-map products
        cur.execute("""
            UPDATE products
            SET category_id = %s
            WHERE category_id = ANY(%s);
        """, (canonical_id, duplicate_ids))
        total_repointed_products += cur.rowcount

        # Re-map category_brands
        for dup_id in duplicate_ids:
            # Delete if brand already mapped to canonical
            cur.execute("""
                DELETE FROM category_brands
                WHERE category_id = %s
                  AND brand_id IN (
                      SELECT brand_id FROM category_brands WHERE category_id = %s
                  );
            """, (dup_id, canonical_id))
            # Move the remaining
            cur.execute("""
                UPDATE category_brands
                SET category_id = %s
                WHERE category_id = %s;
            """, (canonical_id, dup_id))
            total_repointed_brands += cur.rowcount

        # Re-map any child categories
        cur.execute("""
            UPDATE categories
            SET parent_id = %s
            WHERE parent_id = ANY(%s);
        """, (canonical_id, duplicate_ids))

        # Delete duplicate category rows
        cur.execute("""
            DELETE FROM categories
            WHERE id = ANY(%s);
        """, (duplicate_ids,))
        total_deleted_cats += cur.rowcount

    print(f"[3] Cleaned up: repointed {total_repointed_products} products, {total_repointed_brands} brand mappings.")
    print(f"    Deleted {total_deleted_cats} duplicate category records.")

    # Ensure all category names are Title-Cased properly
    cur.execute("SELECT id, name FROM categories;")
    for cid, cname in cur.fetchall():
        # Title case while preserving acronyms like 'PCs', 'GPS', etc.
        words = cname.strip().split()
        title_words = []
        for w in words:
            if w.upper() in ("PC", "PCS", "GPS", "TWS", "ANC", "5G", "4G", "AMOLED", "LED", "USB", "&"):
                title_words.append(w.upper())
            elif w.lower() in ("and", "or", "of", "in", "for"):
                title_words.append(w.lower())
            else:
                title_words.append(w.capitalize())
        fixed_name = " ".join(title_words)
        # Always capitalize the very first word
        if fixed_name and fixed_name[0].islower():
            fixed_name = fixed_name[0].upper() + fixed_name[1:]
        if fixed_name != cname:
            cur.execute("UPDATE categories SET name = %s WHERE id = %s;", (fixed_name, cid))

    print("[4] Creating functional UNIQUE index on categories...")
    cur.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_parent_lower_name 
        ON categories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'), lower(trim(name)));
    """)

    # Verification
    cur.execute("SELECT count(*) FROM categories;")
    final_count = cur.fetchone()[0]
    cur.execute("""
        SELECT count(*) FROM (
            SELECT 1 FROM categories
            GROUP BY coalesce(parent_id, '00000000-0000-0000-0000-000000000000'), lower(trim(name))
            HAVING count(*) > 1
        ) sub;
    """)
    remaining_dups = cur.fetchone()[0]

    if remaining_dups > 0:
        raise RuntimeError(f"Verification failed: {remaining_dups} duplicate categories still exist!")

    conn.commit()
    print(f"[SUCCESS] Categories cleanup complete! Final total clean categories: {final_count}, Duplicates: 0.")

except Exception as err:
    conn.rollback()
    print(f"[ERROR] Transaction rolled back due to error: {err}")
    raise
finally:
    cur.close()
    conn.close()
