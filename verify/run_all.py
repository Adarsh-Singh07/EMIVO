"""
verify/run_all.py

Runs all EMIVO verification suites sequentially and produces a report.

Usage:
    python verify/run_all.py

Requirements:
    - API server must be running on localhost:8000
    - .env must be present at project root with DATABASE_URL
"""
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent

SUITES = [
    ("Auth",      ROOT / "auth"      / "verify_auth.py"),
    ("Products",  ROOT / "products"  / "verify_products.py"),
    ("Customers", ROOT / "customers" / "verify_customers.py"),
    ("Orders",    ROOT / "orders"    / "verify_orders.py"),
    ("Carts",     ROOT / "carts"     / "verify_carts.py"),
    ("Payments",  ROOT / "payments"  / "verify_payments.py"),
    ("Coupons",   ROOT / "coupons"   / "verify_coupons.py"),
]

WIDTH = 60


def divider(char="="):
    print(char * WIDTH)


def main():
    divider()
    print("  EMIVO — Full Regression Test Suite")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    divider()

    results = []

    for name, script in SUITES:
        if not script.exists():
            print(f"\n[SKIP] {name}: script not found ({script})")
            results.append((name, "SKIP", 0))
            continue

        print(f"\n[RUN]  {name} ({script.name})")
        divider("-")
        start = time.time()
        proc = subprocess.run(
            [sys.executable, str(script)],
            capture_output=False
        )
        elapsed = time.time() - start
        status = "PASS" if proc.returncode == 0 else "FAIL"
        results.append((name, status, elapsed))
        divider("-")
        print(f"  -> {name}: {status} ({elapsed:.1f}s)")

    divider()
    print("\n  FINAL REPORT")
    divider()
    passed = 0
    failed = 0
    skipped = 0
    for name, status, elapsed in results:
        if status == "PASS":
            icon = "[PASS]"
            passed += 1
        elif status == "FAIL":
            icon = "[FAIL]"
            failed += 1
        else:
            icon = "[SKIP]"
            skipped += 1
        elapsed_str = f"{elapsed:.1f}s" if elapsed else "  -  "
        print(f"  {icon}  {name:<15} {elapsed_str}")

    divider()
    print(f"  Total: {passed} passed, {failed} failed, {skipped} skipped")
    divider()

    if failed > 0:
        print("\n  REGRESSION TEST FAILED — do not deploy.")
        sys.exit(1)
    else:
        print("\n  ALL SUITES PASSED — ready for deployment.")


if __name__ == "__main__":
    main()
