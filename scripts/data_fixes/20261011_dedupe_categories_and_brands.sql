-- One-off data fix (2026-10-11): production category/brand hygiene for the
-- category-landing overhaul.
--
-- 1) Deduplicate child categories: many (parent, slug) pairs had dozens of
--    identical rows (repeated admin "Add category" clicks). Keep the OLDEST
--    row per (parent_id, slug); re-point products to it; delete the rest.
-- 2) Consolidate case-differing brand spellings (vivo/Vivo, MOTOROLA/
--    Motorola): keep the title-cased row, rewrite products.brand to the
--    canonical spelling, drop the duplicate brand rows (their
--    category_brands links cascade away).
--
-- Run: single transaction, verify inside, commit only if clean.

\set ON_ERROR_STOP on
BEGIN;

-- ---------- 1) duplicate child categories ----------
CREATE TEMP TABLE dup_cat_map AS
SELECT c.id AS dup_id,
       (SELECT k.id FROM categories k
        WHERE k.parent_id = c.parent_id AND k.slug = c.slug
        ORDER BY k.position, k.id LIMIT 1) AS keep_id
FROM categories c
WHERE c.parent_id IS NOT NULL;

UPDATE products p SET category_id = m.keep_id
FROM dup_cat_map m
WHERE p.category_id = m.dup_id
  AND m.keep_id IS DISTINCT FROM m.dup_id;

DELETE FROM categories c USING dup_cat_map m
WHERE c.id = m.dup_id
  AND m.keep_id IS DISTINCT FROM m.dup_id;

-- ---------- 2) brand spelling consolidation ----------
CREATE TEMP TABLE brand_keep AS
SELECT DISTINCT ON (lower(b.name))
       b.id   AS keep_id,
       b.name AS keep_name,
       lower(b.name) AS lname
FROM brands b
ORDER BY lower(b.name),
         CASE WHEN b.name = initcap(b.name) THEN 0 ELSE 1 END,  -- prefer title case
         b.created_at;

CREATE TEMP TABLE brand_dup_map AS
SELECT b.id AS dup_id, kk.keep_id, kk.keep_name
FROM brands b
JOIN brand_keep kk ON kk.lname = lower(b.name)
WHERE b.id <> kk.keep_id;

UPDATE products p SET brand = d.keep_name
FROM brand_dup_map d
WHERE lower(p.brand) = lower(d.keep_name);

DELETE FROM brands b USING brand_dup_map d
WHERE b.id = d.dup_id;   -- category_brands.brand_id is ON DELETE CASCADE

-- ---------- verify before committing ----------
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT 1 FROM categories c
    WHERE c.parent_id IS NOT NULL
    GROUP BY c.parent_id, c.slug
    HAVING count(*) > 1
  ) x;
  IF bad > 0 THEN
    RAISE EXCEPTION 'duplicate child categories remain: %', bad;
  END IF;

  SELECT count(*) INTO bad FROM (
    SELECT 1 FROM products
    WHERE brand IS NOT NULL AND brand <> ''
    GROUP BY lower(brand)
    HAVING count(DISTINCT brand) > 1
  ) y;
  IF bad > 0 THEN
    RAISE EXCEPTION 'conflicting brand spellings remain: %', bad;
  END IF;
END $$;

COMMIT;

-- ---------- audit trail ----------
SELECT 'deduped child categories' AS check, count(*) AS value
FROM (
  SELECT c.id FROM categories c
  WHERE c.parent_id IS NOT NULL
  GROUP BY c.parent_id, c.slug
) t;
