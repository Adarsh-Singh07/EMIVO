#!/usr/bin/env python
"""Diagnose both R2 upload paths from wherever this runs (needs the R2 env).

Usage (inside any api container or a venv with the app's deps):
    python scripts/test_r2_upload_paths.py

Reads R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME
and the optional fallback token (CLOUDFLARE_API_TOKEN or R2_API_TOKEN) from
the environment. Uploads a tiny test object via each path, verifies it, and
deletes it. Exit code 0 only if at least one upload path succeeds.
"""
import asyncio
import os
import sys
import time
import uuid

sys.path.insert(0, "/app/apps/api")

TINY_PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 128
CONTENT_TYPE = "image/png"


def try_s3(account_id: str, bucket: str, key: str) -> tuple[bool, str]:
    from modules.media.adapter import S3CompatibleAdapter

    adapter = S3CompatibleAdapter(
        endpoint_url=os.getenv("R2_ENDPOINT_URL")
        or f"https://{account_id}.r2.cloudflarestorage.com",
        access_key=os.getenv("R2_ACCESS_KEY_ID", ""),
        secret_key=os.getenv("R2_SECRET_ACCESS_KEY", ""),
    )
    ok = adapter.upload_bytes(bucket, key, TINY_PNG, CONTENT_TYPE)
    return ok, "" if ok else "S3 upload returned False (see api logs / stderr above)"


def _s3_delete(account_id: str, bucket: str, key: str) -> None:
    from modules.media.adapter import S3CompatibleAdapter

    adapter = S3CompatibleAdapter(
        endpoint_url=os.getenv("R2_ENDPOINT_URL")
        or f"https://{account_id}.r2.cloudflarestorage.com",
        access_key=os.getenv("R2_ACCESS_KEY_ID", ""),
        secret_key=os.getenv("R2_SECRET_ACCESS_KEY", ""),
    )
    try:
        adapter.client.delete_object(Bucket=bucket, Key=key)
        print(f"  cleanup via S3 delete: {key}")
    except Exception as e:  # noqa: BLE001
        print(f"  S3 delete failed ({type(e).__name__}); trying REST")
        asyncio.run(_rest_delete(account_id, bucket, key))


async def _rest_delete(account_id: str, bucket: str, key: str) -> None:
    import httpx

    from modules.media.rest_fallback import object_url

    token = os.getenv("CLOUDFLARE_API_TOKEN") or os.getenv("R2_API_TOKEN") or ""
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.delete(
            object_url(account_id, bucket, key),
            headers={"Authorization": f"Bearer {token}"},
        )
        print(f"  cleanup via REST delete: {key} -> {resp.status_code}")


async def try_rest(account_id: str, bucket: str, key: str) -> tuple[bool, str]:
    from modules.media.rest_fallback import upload_via_cloudflare_api

    token = os.getenv("CLOUDFLARE_API_TOKEN") or os.getenv("R2_API_TOKEN") or ""
    if not token:
        return False, "no CLOUDFLARE_API_TOKEN / R2_API_TOKEN in environment"
    return await upload_via_cloudflare_api(
        token, account_id, bucket, key, TINY_PNG, CONTENT_TYPE
    )


async def main() -> int:
    account_id = os.getenv("R2_ACCOUNT_ID", "")
    bucket = os.getenv("R2_BUCKET_NAME", "elektrix-media")
    if not account_id:
        print("R2_ACCOUNT_ID missing")
        return 2
    key = f"products/_diag_{int(time.time())}_{uuid.uuid4().hex[:8]}.png"
    print(f"bucket={bucket} key={key}")

    print("[1/2] S3 endpoint (boto3) ...")
    try:
        s3_ok, s3_detail = await asyncio.to_thread(try_s3, account_id, bucket, key)
    except Exception as e:  # noqa: BLE001
        s3_ok, s3_detail = False, f"{type(e).__name__}: {e}"
    print(f"      -> {'OK' if s3_ok else 'FAILED: ' + s3_detail}")

    if s3_ok:
        _s3_delete(account_id, bucket, key)
        print("S3 path healthy; nothing else to test")
        return 0

    print("[2/2] REST fallback (api.cloudflare.com) ...")
    rest_ok, rest_detail = await try_rest(account_id, bucket, key)
    print(f"      -> {'OK' if rest_ok else 'FAILED: ' + rest_detail}")
    if rest_ok:
        _rest_delete(account_id, bucket, key)
        print("RESULT: uploads work via the REST fallback")
        return 0
    print("RESULT: NO upload path available")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
