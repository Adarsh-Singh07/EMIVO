"""Fallback upload path via the Cloudflare REST API (api.cloudflare.com).

The R2 S3 endpoint (<account>.r2.cloudflarestorage.com) only accepts S3
credentials and became TLS-unreachable from the deployment networks in Sep
2026; api.cloudflare.com stays reachable and accepts a Cloudflare API token
with R2 edit scope (CLOUDFLARE_API_TOKEN or R2_API_TOKEN env var). This
module is the single implementation of that fallback — the router, tests and
scripts/test_r2_upload_paths.py all go through it.
"""
import asyncio
from urllib.parse import quote

import httpx

CF_API_BASE = "https://api.cloudflare.com/client/v4"


def object_url(account_id: str, bucket: str, key: str) -> str:
    """REST URL for one R2 object. The key MUST be fully percent-encoded —
    the endpoint treats everything after /objects/ as a single path segment,
    so a literal '/' inside the key (e.g. products/x.png) makes the API
    return 7003 'could not route' instead of addressing the object."""
    return (
        f"{CF_API_BASE}/accounts/{account_id}/r2/buckets/{bucket}"
        f"/objects/{quote(key, safe='')}"
    )


async def upload_via_cloudflare_api(
    token: str,
    account_id: str,
    bucket: str,
    key: str,
    data: bytes,
    content_type: str | None = None,
    timeout: float = 60.0,
    attempts: int = 3,
) -> tuple[bool, str]:
    """PUT one object to R2 through api.cloudflare.com. Returns (ok, detail).

    detail is "" on success, otherwise a short operator-readable reason.
    Retries a few times with backoff — the edge flaps per-connection during
    the APAC degradation."""
    if not token or not account_id:
        return False, "Cloudflare API token or account id is not configured"

    headers = {"Authorization": f"Bearer {token}"}
    if content_type:
        headers["Content-Type"] = content_type
    url = object_url(account_id, bucket, key)
    detail = "no attempts made"
    for attempt in range(attempts):
        try:
            async with httpx.AsyncClient(timeout=timeout) as http:
                resp = await http.put(url, headers=headers, content=data)
        except httpx.HTTPError as e:
            detail = f"REST API request failed: {type(e).__name__}: {e}"
        else:
            if resp.status_code == 200:
                return True, ""
            detail = (
                f"REST API upload failed with status {resp.status_code}: {resp.text[:200]}"
            )
        await asyncio.sleep(0.5 * (attempt + 1))
    return False, detail
