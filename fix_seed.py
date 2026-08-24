import sys
with open("scripts/seed_store.py", "r") as f:
    content = f.read()

new_content = content.replace("""            await s.execute(text(\"\"\"
                INSERT INTO inventory (id, product_id, business_id, on_hand, reserved, low_stock_threshold)
                VALUES (:i, :p, :b, :oh, 0, 5)
                ON CONFLICT (product_id) DO NOTHING
            \"\"\"), {"i": str(uuidlib.uuid4()), "p": pid, "b": business_id, "oh": stock})""", """            inv_exists = (await s.execute(text("SELECT id FROM inventory WHERE product_id = :p AND variant_id IS NULL"), {"p": pid})).scalar()
            if not inv_exists:
                await s.execute(text(\"\"\"
                    INSERT INTO inventory (id, product_id, business_id, on_hand, reserved, low_stock_threshold)
                    VALUES (:i, :p, :b, :oh, 0, 5)
                \"\"\"), {"i": str(uuidlib.uuid4()), "p": pid, "b": business_id, "oh": stock})""")

with open("scripts/seed_store.py", "w") as f:
    f.write(new_content)
