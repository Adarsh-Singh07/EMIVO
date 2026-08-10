"""
Apply ALL EMIVO RLS policies to Supabase.
Run from project root: python scripts/apply_all_rls.py
"""
import asyncio
import os
import re
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

RLS_FILES = [
    "db/rls/00_app_role.sql",
    "db/rls/01_businesses.sql",
    "db/rls/02_products.sql",
    "db/rls/03_orders.sql",
    "db/rls/04_customers.sql",
    "db/rls/05_settings.sql",
    "db/rls/06_users.sql",
    "db/rls/07_carts.sql",
    "db/rls/08_coupons.sql",
    "db/rls/09_payments.sql",
]

ROOT = Path(__file__).parent.parent


def split_sql_statements(sql: str) -> list[str]:
    """Split SQL text into statements while respecting $$ dollar-quoted blocks."""
    statements = []
    current = []
    in_dollar = False
    
    for line in sql.splitlines():
        stripped = line.strip()
        if not in_dollar and (not stripped or stripped.startswith("--")):
            continue
        
        # Check for dollar quotes toggling
        dollar_matches = re.findall(r"\$\$", line)
        if len(dollar_matches) % 2 != 0:
            in_dollar = not in_dollar
            
        current.append(line)
        
        if not in_dollar and stripped.endswith(";"):
            stmt = "\n".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
            
    if current:
        stmt = "\n".join(current).strip()
        if stmt:
            statements.append(stmt)
            
    return statements


async def apply_file(conn, filepath: Path):
    sql = filepath.read_text(encoding="utf-8")
    statements = split_sql_statements(sql)
    for stmt in statements:
        try:
            await conn.execute(text(stmt))
        except Exception as e:
            print(f"  WARN [{filepath.name}]: {e}")
            raise


async def main():
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not set in .env")
        sys.exit(1)

    engine = create_async_engine(db_url, isolation_level="AUTOCOMMIT")

    async with engine.connect() as conn:
        for rls_file in RLS_FILES:
            path = ROOT / rls_file
            if not path.exists():
                print(f"  SKIP: {rls_file} not found")
                continue
            try:
                await apply_file(conn, path)
                print(f"  OK: {rls_file}")
            except Exception as e:
                print(f"  FAIL: {rls_file} -> {e}")
                sys.exit(1)

    await engine.dispose()
    print("\nAll RLS policies applied successfully.")


if __name__ == "__main__":
    asyncio.run(main())
